import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Invoice, TableNumber } from '../../models/order.models';
import { CartService } from '../../services/cart.service';

interface TableOption {
  number: TableNumber;
  id: number;
}

function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-cart-drawer',
  standalone: true,
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
})
export class CartDrawerComponent {
  @Input() isOpen = false;
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly orderPlaced = new EventEmitter<Invoice>();

  protected readonly cart = inject(CartService);
  protected readonly serviceChargeEnabled = signal(false);
  protected readonly tableOptions: TableOption[] = [
    { number: 'VIP-01', id: 1 },
    { number: 'VIP-02', id: 2 },
    { number: 'ROYAL-03', id: 3 },
    { number: 'TERRACE-04', id: 4 },
  ];
  protected readonly itemSubtotal = this.cart.subtotal;
  protected readonly cgst = computed(() =>
    roundCurrency(this.itemSubtotal() * 0.025),
  );
  protected readonly sgst = computed(() =>
    roundCurrency(this.itemSubtotal() * 0.025),
  );
  protected readonly serviceCharge = computed(() =>
    this.serviceChargeEnabled()
      ? roundCurrency(this.itemSubtotal() * 0.05)
      : 0,
  );
  protected readonly grandTotal = computed(() =>
    roundCurrency(
      this.itemSubtotal() + this.cgst() + this.sgst() + this.serviceCharge(),
    ),
  );
  protected customerName = '';
  protected customerPhone = '';
  protected tableNumber: TableNumber = 'VIP-01';

  protected toggleServiceCharge(enabled: boolean): void {
    this.serviceChargeEnabled.set(enabled);
  }

  protected placeOrder(formValid: boolean): void {
    const customerName = this.customerName.trim();
    const customerPhone = this.customerPhone.trim();
    if (
      !formValid ||
      !customerName ||
      !customerPhone ||
      this.cart.items().length === 0
    ) {
      return;
    }

    const table = this.tableOptions.find(
      (option) => option.number === this.tableNumber,
    );
    if (!table) {
      return;
    }

    const issuedAt = new Date();
    const invoice: Invoice = {
      invoiceNumber: `GF-${issuedAt.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      issuedAt,
      customerName,
      customerPhone,
      tableNumber: table.number,
      tableId: table.id,
      items: this.cart.items().map((item) => ({
        ...item,
        amount: roundCurrency(item.price * item.quantity),
      })),
      itemSubtotal: roundCurrency(this.itemSubtotal()),
      cgst: this.cgst(),
      sgst: this.sgst(),
      serviceCharge: this.serviceCharge(),
      grandTotal: this.grandTotal(),
    };

    this.orderPlaced.emit(invoice);
    this.cart.clear();
    this.customerName = '';
    this.customerPhone = '';
    this.tableNumber = 'VIP-01';
    this.serviceChargeEnabled.set(false);
  }

  protected close(): void {
    this.closeRequested.emit();
  }
}
