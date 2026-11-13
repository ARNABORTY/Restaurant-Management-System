import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { Invoice } from '../../models/order.models';
import { OrderService } from '../../services/order.service';

describe('DashboardComponent', () => {
  it('switches sections and keeps inventory adjustments across tab changes', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector<HTMLElement>('#overview-panel')?.hidden).toBe(false);

    root.querySelector<HTMLButtonElement>('#inventory-tab')?.click();
    fixture.detectChanges();
    expect(root.querySelector<HTMLElement>('#inventory-panel')?.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('#staff-panel')?.hidden).toBe(true);

    root.querySelector<HTMLButtonElement>('.restock-button')?.click();
    fixture.detectChanges();
    expect(root.querySelector('.quantity')?.textContent?.trim()).toBe('3.4');

    root.querySelector<HTMLButtonElement>('#staff-tab')?.click();
    fixture.detectChanges();
    expect(root.querySelector<HTMLElement>('#staff-panel')?.hidden).toBe(false);
    expect(root.querySelectorAll('.roster-table tbody tr')).toHaveLength(6);

    root.querySelector<HTMLButtonElement>('#inventory-tab')?.click();
    fixture.detectChanges();
    expect(root.querySelector('.quantity')?.textContent?.trim()).toBe('3.4');
  });

  it('reflects kitchen order updates from the shared order service', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const orders = TestBed.inject(OrderService);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const invoice: Invoice = {
      invoiceNumber: 'GF-2026-4312',
      issuedAt: new Date('2026-11-13T20:00:00'),
      customerName: 'Aarav Mehta',
      customerPhone: '+919876543210',
      tableNumber: 'VIP-02',
      tableId: 2,
      items: [
        {
          id: 'saffron-scallops',
          name: 'Saffron Sea Scallops',
          price: 1250,
          quantity: 1,
          amount: 1250,
        },
      ],
      itemSubtotal: 1250,
      cgst: 31.25,
      sgst: 31.25,
      serviceCharge: 0,
      grandTotal: 1312.5,
    };

    const order = orders.receiveOrder(invoice);
    orders.startPreparing(order.orderId);
    orders.markReady(order.orderId);
    orders.serveToTable(order.orderId);
    fixture.detectChanges();

    const secondTable = fixture.nativeElement.querySelectorAll(
      '.table-card',
    )[1] as HTMLElement;
    expect(orders.orders()[0].status).toBe('Served');
    expect(secondTable.querySelector('.status-badge')?.textContent).toContain(
      'Occupied',
    );
    expect(orders.tables()[1].orderTotal).toBe(1312.5);
    expect(secondTable.querySelector('.table-bill strong')?.textContent).toContain('₹1,313');

    secondTable.querySelector<HTMLButtonElement>('.clear-button')?.click();
    fixture.detectChanges();

    expect(orders.settledBills()[0]).toMatchObject({
      tableId: 2,
      amount: 1312.5,
      orderCount: 1,
    });
    expect(orders.settledInvoices()[0]).toMatchObject({
      invoiceNumber: 'GF-2026-4312',
      cgst: 31.25,
      sgst: 31.25,
    });
    expect(
      fixture.nativeElement.querySelector('.kpi-card .kpi-value')?.textContent,
    ).toContain('₹1,313');
    expect(
      fixture.nativeElement.querySelector('.gst-report-print .tax-table tbody tr')
        ?.textContent,
    ).toContain('GF-2026-4312');
    expect(
      fixture.nativeElement.querySelector('.dish-name-line')?.textContent,
    ).toContain('Saffron Sea Scallops');
  });

  it('filters floor tables and raises a kitchen alert for the KDS', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const orders = TestBed.inject(OrderService);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[data-status="Occupied"]')?.click();
    fixture.detectChanges();

    expect(root.querySelectorAll('.table-card')).toHaveLength(3);
    expect(
      [...root.querySelectorAll('.table-card .status-badge')].every((badge) =>
        badge.textContent?.includes('Occupied'),
      ),
    ).toBe(true);

    root.querySelector<HTMLButtonElement>('.alert-action')?.click();
    fixture.detectChanges();
    expect(orders.kitchenAlert()?.message).toContain('Executive priority');
    expect(root.querySelector('.alert-confirmation')?.textContent).toContain(
      'sent to the Kitchen Display',
    );

    const alertId = orders.kitchenAlert()?.id;
    if (alertId) {
      orders.acknowledgeKitchenAlert(alertId);
    }
    expect(orders.kitchenAlert()).toBeNull();
  });
});
