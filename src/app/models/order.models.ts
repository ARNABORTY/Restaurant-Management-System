export type TableNumber = 'VIP-01' | 'VIP-02' | 'ROYAL-03' | 'TERRACE-04';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  image?: string;
}

export interface InvoiceItem extends CartItem {
  amount: number;
  specialInstructions?: string;
}

export interface Invoice {
  invoiceNumber: string;
  issuedAt: Date;
  customerName: string;
  customerPhone: string;
  tableNumber: TableNumber;
  tableId: number;
  items: InvoiceItem[];
  itemSubtotal: number;
  cgst: number;
  sgst: number;
  serviceCharge: number;
  grandTotal: number;
}

export interface SettledBill {
  tableId: number;
  tableNumber: string;
  amount: number;
  settledAt: Date;
  orderCount: number;
}

export interface SettledInvoice extends Invoice {
  settledAt: Date;
}

export type KitchenOrderStatus =
  | 'Received'
  | 'Preparing'
  | 'Ready to Serve'
  | 'Served';

export interface KitchenOrderItem {
  id: string;
  name: string;
  quantity: number;
  specialInstructions?: string;
}

export interface KitchenOrder {
  orderId: string;
  tableId: number;
  tableNumber: TableNumber;
  customerName: string;
  items: KitchenOrderItem[];
  orderTimestamp: Date;
  status: KitchenOrderStatus;
  grandTotal: number;
  servedAt?: Date;
}

export type TableStatus = 'Available' | 'Occupied' | 'Reserved';

export interface DiningTable {
  id: number;
  tableNumber: string;
  seats: number;
  status: TableStatus;
  orderTotal: number;
  reservation?: TableReservationDetails;
}

export interface TableReservationDetails {
  referenceId: string;
  guestName: string;
  date: string;
  time: string;
}
