import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Invoice } from '../../models/order.models';
import { OrderService } from '../../services/order.service';
import { AnalyticsComponent } from './analytics.component';

describe('AnalyticsComponent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('switches chart periods and downloads a CSV after a bill is settled', async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
    }).compileComponents();

    const orders = TestBed.inject(OrderService);
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.chart-column').length).toBe(7);
    element.querySelector<HTMLButtonElement>('.range-switch button:last-child')?.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.chart-column').length).toBe(new Date().getDate());

    const invoice: Invoice = {
      invoiceNumber: 'GF-2026-7788',
      issuedAt: new Date(),
      customerName: 'Ananya Mehta',
      customerPhone: '+919876543210',
      tableNumber: 'VIP-01',
      tableId: 1,
      items: [
        {
          id: 'saffron-scallops',
          name: 'Saffron Sea Scallops',
          price: 1250,
          quantity: 1,
          amount: 1250,
          category: 'Starters',
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
    orders.clearTableBill(invoice.tableId);
    fixture.detectChanges();

    const createObjectUrl = vi.fn(() => 'blob:gst-report');
    vi.stubGlobal('URL', {
      createObjectURL: createObjectUrl,
      revokeObjectURL: vi.fn(),
    });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    element.querySelector<HTMLButtonElement>('.export-csv')?.click();

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(element.querySelector('.tax-table tbody')?.textContent).toContain(
      'GF-2026-7788',
    );
  });
});
