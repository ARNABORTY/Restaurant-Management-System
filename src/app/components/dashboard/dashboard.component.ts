import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsComponent } from '../analytics/analytics.component';
import { InventoryComponent } from '../inventory/inventory.component';
import { StaffRosterComponent } from '../staff-roster/staff-roster.component';
import { DiningTable, TableStatus } from '../../models/order.models';
import { OrderService } from '../../services/order.service';
import { ReservationService } from '../../services/reservation.service';
import { StaffRosterService } from '../../services/staff-roster.service';

type DashboardTab = 'overview' | 'inventory' | 'staff';
type TableFilter = TableStatus | 'All';

interface TickerPhoto {
  title: string;
  image: string;
}

@Component({
  imports: [
    CommonModule,
    RouterLink,
    AnalyticsComponent,
    InventoryComponent,
    StaffRosterComponent,
  ],
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly orderService = inject(OrderService);
  private readonly reservationService = inject(ReservationService);
  private readonly staffRosterService = inject(StaffRosterService);

  @ViewChild(AnalyticsComponent) private analyticsComponent?: AnalyticsComponent;

  protected readonly tables = this.orderService.tables;
  protected readonly reservations = this.reservationService.reservations;
  protected readonly activeOrders = this.orderService.activeOrderCount;
  protected readonly kitchenAlert = this.orderService.kitchenAlert;
  protected readonly activeTab = signal<DashboardTab>('overview');
  protected readonly tableFilter = signal<TableFilter>('All');
  protected readonly tableStatuses: TableStatus[] = [
    'Occupied',
    'Reserved',
    'Available',
  ];
  protected readonly tickerPhotos: TickerPhoto[] = [
    {
      title: 'The royal dining room',
      image:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=85',
    },
    {
      title: 'A signature plated course',
      image:
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=85',
    },
    {
      title: 'The candlelight terrace',
      image:
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=85',
    },
    {
      title: 'A toast to the evening',
      image:
        'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1000&q=85',
    },
  ];

  protected readonly visibleTables = computed(() => {
    const filter = this.tableFilter();
    return filter === 'All'
      ? this.tables()
      : this.tables().filter((table) => table.status === filter);
  });
  protected readonly occupancyRate = computed(() => {
    const tables = this.tables();
    return tables.length
      ? Math.round(
          (tables.filter((table) => table.status === 'Occupied').length /
            tables.length) *
            100,
        )
      : 0;
  });
  protected readonly activeChef = computed(
    () =>
      this.staffRosterService
        .roster()
        .find(
          (staff) =>
            staff.role.toLowerCase().includes('chef') &&
            staff.attendance === 'On Duty',
        )?.staffName ?? 'No chef scheduled',
  );
  protected readonly vipBookingsToday = computed(() => {
    const today = this.dateKey(new Date());
    return this.reservations().filter(
      (booking) =>
        booking.date === today && booking.zone === 'Private VIP Booth',
    ).length;
  });
  protected readonly tableStatusGradient = computed(() => {
    const counts = this.tableStatuses.map(
      (status) =>
        this.tables().filter((table) => table.status === status).length,
    );
    const total = this.tables().length;
    if (!total) {
      return 'conic-gradient(#28251e 0% 100%)';
    }

    const colors = ['#d4af37', '#9c83c5', '#73977d'];
    let start = 0;
    const segments = counts.map((count, index) => {
      const end = start + (count / total) * 100;
      const segment = `${colors[index]} ${start}% ${end}%`;
      start = end;
      return segment;
    });
    return `conic-gradient(${segments.join(', ')})`;
  });

  protected selectTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  protected selectTableFilter(filter: TableFilter): void {
    this.tableFilter.set(filter);
  }

  protected tableCount(status: TableStatus): number {
    return this.tables().filter((table) => table.status === status).length;
  }

  protected toggleStatus(tableId: number): void {
    this.orderService.toggleTableStatus(tableId);
  }

  protected clearBill(tableId: number): void {
    this.orderService.clearTableBill(tableId);
  }

  protected exportGstReport(): void {
    this.analyticsComponent?.exportCsvReport();
  }

  protected raiseKitchenAlert(): void {
    this.orderService.raiseKitchenAlert();
  }

  private dateKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
