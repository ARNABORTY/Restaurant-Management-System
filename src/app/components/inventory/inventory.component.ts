import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { InventoryItem, InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent {
  private readonly inventoryService = inject(InventoryService);

  protected readonly inventory = this.inventoryService.inventory;
  protected readonly criticalCount = computed(
    () => this.inventory().filter((item) => this.statusOf(item) === 'Critical').length,
  );
  protected readonly lowCount = computed(
    () => this.inventory().filter((item) => this.statusOf(item) === 'Low Stock').length,
  );

  protected statusOf(item: InventoryItem): 'In Stock' | 'Low Stock' | 'Critical' {
    if (item.quantity <= item.threshold * 0.5) {
      return 'Critical';
    }
    return item.quantity <= item.threshold ? 'Low Stock' : 'In Stock';
  }

  protected statusClass(item: InventoryItem): string {
    return this.statusOf(item).toLowerCase().replace(' ', '-');
  }

  protected restock(item: InventoryItem): void {
    this.inventoryService.restock(item.id);
  }

  protected recordUsage(item: InventoryItem): void {
    this.inventoryService.recordUsage(item.id);
  }

  protected formatQuantity(quantity: number): string {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(
      quantity,
    );
  }
}
