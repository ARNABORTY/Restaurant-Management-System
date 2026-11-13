import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { KitchenOrder } from '../../models/order.models';
import { OrderService } from '../../services/order.service';

@Component({
  imports: [CommonModule],
  selector: 'app-kds',
  standalone: true,
  styleUrl: './kds.component.scss',
  templateUrl: './kds.component.html',
})
export class KdsComponent implements OnInit {
  protected readonly orderService = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clock = signal(Date.now());

  protected readonly incomingOrders = computed(() =>
    this.ordersInStatus('Received'),
  );
  protected readonly preparingOrders = computed(() =>
    this.ordersInStatus('Preparing'),
  );
  protected readonly readyOrders = computed(() =>
    this.orderService
      .orders()
      .filter(
        (order) =>
          order.status === 'Ready to Serve' || order.status === 'Served',
      )
      .sort((first, second) =>
        first.orderTimestamp.getTime() - second.orderTimestamp.getTime(),
      ),
  );

  ngOnInit(): void {
    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.clock.set(Date.now()));
  }

  protected elapsedTime(order: KitchenOrder): string {
    const elapsedMinutes = Math.max(
      0,
      Math.floor((this.clock() - order.orderTimestamp.getTime()) / 60_000),
    );
    return elapsedMinutes === 0
      ? 'Just now'
      : `${elapsedMinutes} ${elapsedMinutes === 1 ? 'min' : 'mins'} ago`;
  }

  protected startPreparing(orderId: string): void {
    this.orderService.startPreparing(orderId);
  }

  protected markReady(orderId: string): void {
    this.orderService.markReady(orderId);
  }

  protected serveToTable(orderId: string): void {
    this.orderService.serveToTable(orderId);
  }

  protected acknowledgeKitchenAlert(alertId: string): void {
    this.orderService.acknowledgeKitchenAlert(alertId);
  }

  private ordersInStatus(status: 'Received' | 'Preparing'): KitchenOrder[] {
    return this.orderService
      .orders()
      .filter((order) => order.status === status)
      .sort((first, second) =>
        first.orderTimestamp.getTime() - second.orderTimestamp.getTime(),
      );
  }
}
