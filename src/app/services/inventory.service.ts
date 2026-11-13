import { Injectable, signal } from '@angular/core';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: 'kg' | 'pcs' | 'bottles';
  threshold: number;
  unitCost: number;
  restockStep: number;
  usageStep: number;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'black-truffle',
    name: 'Black Perigord Truffle',
    category: 'Premium Produce',
    quantity: 2.4,
    unit: 'kg',
    threshold: 1.5,
    unitCost: 18500,
    restockStep: 1,
    usageStep: 0.25,
  },
  {
    id: 'a5-wagyu',
    name: 'A5 Wagyu Beef',
    category: 'Butchery',
    quantity: 6.8,
    unit: 'kg',
    threshold: 3,
    unitCost: 24000,
    restockStep: 2,
    usageStep: 0.5,
  },
  {
    id: 'kashmiri-saffron',
    name: 'Kashmiri Saffron',
    category: 'Spices',
    quantity: 0.08,
    unit: 'kg',
    threshold: 0.2,
    unitCost: 325000,
    restockStep: 0.1,
    usageStep: 0.02,
  },
  {
    id: 'atlantic-lobster',
    name: 'Atlantic Lobster',
    category: 'Seafood',
    quantity: 5,
    unit: 'pcs',
    threshold: 4,
    unitCost: 3200,
    restockStep: 2,
    usageStep: 1,
  },
  {
    id: 'vintage-wine',
    name: 'Vintage Wine Stock',
    category: 'Cellar',
    quantity: 22,
    unit: 'bottles',
    threshold: 12,
    unitCost: 12800,
    restockStep: 6,
    usageStep: 1,
  },
];

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly inventoryState = signal(INITIAL_INVENTORY);
  readonly inventory = this.inventoryState.asReadonly();

  restock(itemId: string): void {
    const item = this.getItem(itemId);
    this.setQuantity(itemId, item.quantity + item.restockStep);
  }

  recordUsage(itemId: string): boolean {
    const item = this.getItem(itemId);
    if (item.quantity < item.usageStep) {
      return false;
    }

    this.setQuantity(itemId, item.quantity - item.usageStep);
    return true;
  }

  private getItem(itemId: string): InventoryItem {
    const item = this.inventoryState().find((entry) => entry.id === itemId);
    if (!item) {
      throw new Error(`Unknown inventory item: ${itemId}`);
    }
    return item;
  }

  private setQuantity(itemId: string, quantity: number): void {
    const roundedQuantity = Number(quantity.toFixed(2));
    this.inventoryState.update((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, quantity: roundedQuantity } : item,
      ),
    );
  }
}
