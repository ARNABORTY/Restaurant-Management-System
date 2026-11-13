import { computed, Injectable, signal } from '@angular/core';
import { CartItem } from '../models/order.models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly cartState = signal<CartItem[]>([]);

  readonly items = this.cartState.asReadonly();
  readonly itemCount = computed(() =>
    this.cartState().reduce((count, item) => count + item.quantity, 0),
  );
  readonly subtotal = computed(() =>
    this.cartState().reduce((total, item) => total + item.price * item.quantity, 0),
  );

  addItem(item: Omit<CartItem, 'quantity'>): void {
    this.cartState.update((items) => {
      const existing = items.find((cartItem) => cartItem.id === item.id);
      return existing
        ? items.map((cartItem) =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem,
          )
        : [...items, { ...item, quantity: 1 }];
    });
  }

  increment(itemId: string): void {
    this.cartState.update((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  }

  decrement(itemId: string): void {
    this.cartState.update((items) =>
      items
        .map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  removeItem(itemId: string): void {
    this.cartState.update((items) => items.filter((item) => item.id !== itemId));
  }

  clear(): void {
    this.cartState.set([]);
  }

  quantityFor(itemId: string): number {
    return this.cartState().find((item) => item.id === itemId)?.quantity ?? 0;
  }
}
