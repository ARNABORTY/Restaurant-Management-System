import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';

describe('CartService', () => {
  let cart: CartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    cart = TestBed.inject(CartService);
  });

  it('adds and increments items while keeping quantities and subtotal in sync', () => {
    cart.addItem({ id: 'kulfi', name: 'Rose & Pistachio Kulfi', price: 650 });
    cart.addItem({ id: 'kulfi', name: 'Rose & Pistachio Kulfi', price: 650 });

    expect(cart.items()).toEqual([
      { id: 'kulfi', name: 'Rose & Pistachio Kulfi', price: 650, quantity: 2 },
    ]);
    expect(cart.itemCount()).toBe(2);
    expect(cart.subtotal()).toBe(1300);
  });

  it('removes an item when decrementing its last unit', () => {
    cart.addItem({ id: 'kahwa', name: 'Kashmiri Kahwa', price: 390 });
    cart.decrement('kahwa');

    expect(cart.items()).toEqual([]);
    expect(cart.itemCount()).toBe(0);
    expect(cart.subtotal()).toBe(0);
  });

  it('supports removing individual items and clearing the cart', () => {
    cart.addItem({ id: 'kulfi', name: 'Rose & Pistachio Kulfi', price: 650 });
    cart.addItem({ id: 'kahwa', name: 'Kashmiri Kahwa', price: 390 });
    cart.removeItem('kulfi');
    expect(cart.items().map((item) => item.id)).toEqual(['kahwa']);

    cart.clear();
    expect(cart.items()).toEqual([]);
  });
});
