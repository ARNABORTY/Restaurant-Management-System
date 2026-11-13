import { computed, Injectable, signal } from '@angular/core';
import {
  DiningTable,
  Invoice,
  KitchenOrder,
  KitchenOrderStatus,
  SettledBill,
  SettledInvoice,
  TableReservationDetails,
  TableStatus,
} from '../models/order.models';

export interface KitchenAlert {
  id: string;
  message: string;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly orderState = signal<KitchenOrder[]>([]);
  private readonly invoiceState = signal<Invoice[]>([]);
  private readonly settledBillState = signal<SettledBill[]>([]);
  private readonly settledInvoiceState = signal<SettledInvoice[]>([]);
  private readonly tableState = signal<DiningTable[]>([
    { id: 1, tableNumber: 'VIP-01', seats: 2, status: 'Occupied', orderTotal: 4850 },
    { id: 2, tableNumber: 'VIP-02', seats: 4, status: 'Reserved', orderTotal: 0 },
    { id: 3, tableNumber: 'ROYAL-03', seats: 2, status: 'Available', orderTotal: 0 },
    { id: 4, tableNumber: 'TERRACE-04', seats: 6, status: 'Occupied', orderTotal: 12750 },
    { id: 5, tableNumber: 'ROYAL-05', seats: 4, status: 'Occupied', orderTotal: 6940 },
    { id: 6, tableNumber: 'TERRACE-06', seats: 2, status: 'Available', orderTotal: 0 },
    { id: 7, tableNumber: 'VIP-07', seats: 12, status: 'Reserved', orderTotal: 0 },
    { id: 8, tableNumber: 'ROYAL-08', seats: 4, status: 'Available', orderTotal: 0 },
  ]);
  private readonly appliedOrderIds = new Set<string>();
  private readonly kitchenAlertState = signal<KitchenAlert | null>(null);
  private kitchenAlertSequence = 0;

  readonly orders = this.orderState.asReadonly();
  readonly invoices = this.invoiceState.asReadonly();
  readonly settledBills = this.settledBillState.asReadonly();
  readonly settledInvoices = this.settledInvoiceState.asReadonly();
  readonly tables = this.tableState.asReadonly();
  readonly kitchenAlert = this.kitchenAlertState.asReadonly();
  readonly activeOrderCount = computed(
    () => this.orderState().filter((order) => order.status !== 'Served').length,
  );

  raiseKitchenAlert(): KitchenAlert {
    const alert: KitchenAlert = {
      id: `GF-ALERT-${++this.kitchenAlertSequence}`,
      message: 'Executive priority: review the kitchen pass.',
      createdAt: new Date(),
    };
    this.kitchenAlertState.set(alert);
    return alert;
  }

  acknowledgeKitchenAlert(alertId: string): void {
    if (this.kitchenAlertState()?.id === alertId) {
      this.kitchenAlertState.set(null);
    }
  }

  receiveOrder(invoice: Invoice): KitchenOrder {
    const existing = this.orderState().find(
      (order) => order.orderId === invoice.invoiceNumber,
    );
    if (existing) {
      return existing;
    }

    const order: KitchenOrder = {
      orderId: invoice.invoiceNumber,
      tableId: invoice.tableId,
      tableNumber: invoice.tableNumber,
      customerName: invoice.customerName,
      items: invoice.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
      })),
      orderTimestamp: new Date(invoice.issuedAt),
      status: 'Received',
      grandTotal: invoice.grandTotal,
    };

    this.orderState.update((orders) => [...orders, order]);
    this.invoiceState.update((invoices) => [...invoices, invoice]);
    this.syncTableForOrder(order);
    return order;
  }

  startPreparing(orderId: string): void {
    this.changeStatus(orderId, 'Received', 'Preparing');
  }

  markReady(orderId: string): void {
    this.changeStatus(orderId, 'Preparing', 'Ready to Serve');
  }

  serveToTable(orderId: string): void {
    const order = this.orderState().find((item) => item.orderId === orderId);
    if (!order || order.status !== 'Ready to Serve') {
      return;
    }

    this.changeStatus(orderId, 'Ready to Serve', 'Served', new Date());
    this.syncTableForOrder(order);
  }

  toggleTableStatus(tableId: number): void {
    const nextStatus: Record<TableStatus, TableStatus> = {
      Available: 'Occupied',
      Occupied: 'Reserved',
      Reserved: 'Available',
    };

    this.tableState.update((tables) =>
      tables.map((table) =>
        table.id === tableId
          ? { ...table, status: nextStatus[table.status] }
          : table,
      ),
    );
  }

  clearTableBill(tableId: number): void {
    const table = this.tableState().find((item) => item.id === tableId);
    if (!table || table.orderTotal <= 0) {
      return;
    }

    const unsettledInvoices = this.invoiceState().filter(
      (invoice) =>
        invoice.tableId === tableId &&
        !this.settledInvoiceState().some(
          (settledInvoice) =>
            settledInvoice.invoiceNumber === invoice.invoiceNumber,
        ),
    );
    const settledAt = new Date();
    this.settledBillState.update((bills) => [
      ...bills,
      {
        tableId,
        tableNumber: table.tableNumber,
        amount: table.orderTotal,
        settledAt,
        orderCount: Math.max(unsettledInvoices.length, 1),
      },
    ]);
    this.settledInvoiceState.update((invoices) => [
      ...invoices,
      ...unsettledInvoices.map((invoice) => ({ ...invoice, settledAt })),
    ]);

    this.tableState.update((tables) =>
      tables.map((table) =>
        table.id === tableId ? { ...table, orderTotal: 0 } : table,
      ),
    );
  }

  reserveTable(tableId: number, reservation: TableReservationDetails): void {
    this.tableState.update((tables) =>
      tables.map((table) =>
        table.id === tableId
          ? { ...table, status: 'Reserved', reservation }
          : table,
      ),
    );
  }

  private changeStatus(
    orderId: string,
    expectedStatus: KitchenOrderStatus,
    nextStatus: KitchenOrderStatus,
    servedAt?: Date,
  ): void {
    this.orderState.update((orders) =>
      orders.map((order) =>
        order.orderId === orderId && order.status === expectedStatus
          ? {
              ...order,
              status: nextStatus,
              ...(servedAt ? { servedAt } : {}),
            }
          : order,
      ),
    );
  }

  private syncTableForOrder(order: KitchenOrder): void {
    const shouldAddAmount = !this.appliedOrderIds.has(order.orderId);
    this.tableState.update((tables) =>
      tables.map((table) =>
        table.id === order.tableId
          ? {
              ...table,
              status: 'Occupied',
              orderTotal: shouldAddAmount
                ? table.orderTotal + order.grandTotal
                : table.orderTotal,
            }
          : table,
      ),
    );
    this.appliedOrderIds.add(order.orderId);
  }
}
