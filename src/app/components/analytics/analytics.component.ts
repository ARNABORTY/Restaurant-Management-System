import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { SettledInvoice } from '../../models/order.models';
import { OrderService } from '../../services/order.service';

type RevenueRange = 'week' | 'month';

interface RevenueBar {
  key: string;
  label: string;
  dateLabel: string;
  revenue: number;
  orderCount: number;
  heightPercent: number;
}

interface DishPerformance {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  sharePercent: number;
  image?: string;
}

interface TaxReportRow {
  invoiceNumber: string;
  period: string;
  taxableBase: number;
  cgst: number;
  sgst: number;
  total: number;
}

interface Trend {
  direction: 'up' | 'down' | 'neutral';
  label: string;
}

function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {
  private readonly orderService = inject(OrderService);

  protected readonly revenueRange = signal<RevenueRange>('week');
  protected readonly tables = this.orderService.tables;

  protected readonly todayGrossRevenue = computed(() =>
    this.orderService
      .settledBills()
      .filter((bill) => this.isToday(bill.settledAt))
      .reduce((total, bill) => total + bill.amount, 0),
  );
  protected readonly yesterdayGrossRevenue = computed(() =>
    this.orderService
      .settledBills()
      .filter((bill) => this.isYesterday(bill.settledAt))
      .reduce((total, bill) => total + bill.amount, 0),
  );
  protected readonly revenueTrend = computed(() =>
    this.createTrend(this.todayGrossRevenue(), this.yesterdayGrossRevenue()),
  );

  protected readonly servedOrdersToday = computed(() =>
    this.orderService
      .orders()
      .filter(
        (order) =>
          order.status === 'Served' &&
          !!order.servedAt &&
          this.isToday(order.servedAt),
      ),
  );
  protected readonly yesterdayServedOrderCount = computed(
    () =>
      this.orderService
        .orders()
        .filter(
          (order) =>
            order.status === 'Served' &&
            !!order.servedAt &&
            this.isYesterday(order.servedAt),
        ).length,
  );
  protected readonly ordersTrend = computed(() =>
    this.createTrend(
      this.servedOrdersToday().length,
      this.yesterdayServedOrderCount(),
    ),
  );
  protected readonly averageOrderValue = computed(() => {
    const orders = this.servedOrdersToday();
    return orders.length
      ? orders.reduce((total, order) => total + order.grandTotal, 0) /
          orders.length
      : 0;
  });
  protected readonly averageTurnaround = computed(() => {
    const orders = this.servedOrdersToday().filter((order) => order.servedAt);
    if (!orders.length) {
      return '—';
    }

    const totalMinutes = orders.reduce((total, order) => {
      const elapsed =
        (order.servedAt!.getTime() - order.orderTimestamp.getTime()) / 60_000;
      return total + Math.max(0, elapsed);
    }, 0);
    return `${Math.round(totalMinutes / orders.length)} min`;
  });
  protected readonly turnaroundDetail = computed(() =>
    this.servedOrdersToday().length
      ? 'Average order-to-table time today'
      : 'Appears after the first order is served',
  );

  protected readonly occupiedTables = computed(
    () => this.tables().filter((table) => table.status === 'Occupied').length,
  );
  protected readonly occupancyRate = computed(() =>
    this.tables().length
      ? Math.round((this.occupiedTables() / this.tables().length) * 100)
      : 0,
  );
  protected readonly activeVipTerraceTables = computed(
    () =>
      this.tables().filter(
        (table) =>
          table.status === 'Occupied' &&
          /^(VIP|TERRACE)-/.test(table.tableNumber),
      ).length,
  );

  protected readonly gstToday = computed(() =>
    this.orderService
      .settledInvoices()
      .filter((invoice) => this.isToday(invoice.settledAt))
      .reduce((total, invoice) => total + invoice.cgst + invoice.sgst, 0),
  );
  protected readonly cgstToday = computed(() =>
    this.orderService
      .settledInvoices()
      .filter((invoice) => this.isToday(invoice.settledAt))
      .reduce((total, invoice) => total + invoice.cgst, 0),
  );
  protected readonly sgstToday = computed(() =>
    this.orderService
      .settledInvoices()
      .filter((invoice) => this.isToday(invoice.settledAt))
      .reduce((total, invoice) => total + invoice.sgst, 0),
  );
  protected readonly yesterdayGst = computed(() =>
    this.orderService
      .settledInvoices()
      .filter((invoice) => this.isYesterday(invoice.settledAt))
      .reduce((total, invoice) => total + invoice.cgst + invoice.sgst, 0),
  );
  protected readonly gstTrend = computed(() =>
    this.createTrend(this.gstToday(), this.yesterdayGst()),
  );

  protected readonly chartBars = computed(() =>
    this.buildRevenueBars(this.revenueRange()),
  );
  protected readonly hasChartRevenue = computed(() =>
    this.chartBars().some((bar) => bar.revenue > 0),
  );
  protected readonly topDishes = computed(() => this.buildTopDishes());
  protected readonly reportRows = computed(() =>
    this.orderService
      .settledInvoices()
      .slice()
      .sort((left, right) => right.settledAt.getTime() - left.settledAt.getTime())
      .map((invoice) => this.toReportRow(invoice)),
  );
  protected readonly reportTotals = computed(() =>
    this.reportRows().reduce(
      (totals, row) => ({
        taxableBase: totals.taxableBase + row.taxableBase,
        cgst: totals.cgst + row.cgst,
        sgst: totals.sgst + row.sgst,
        total: totals.total + row.total,
      }),
      { taxableBase: 0, cgst: 0, sgst: 0, total: 0 },
    ),
  );

  protected setRevenueRange(range: RevenueRange): void {
    this.revenueRange.set(range);
  }

  protected downloadCsvReport(): void {
    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Settlement Date',
      'Taxable Base (INR)',
      'CGST @ 2.5% (INR)',
      'SGST @ 2.5% (INR)',
      'Total Invoice Value (INR)',
    ];
    const rows = this.orderService
      .settledInvoices()
      .map((invoice) => [
        invoice.invoiceNumber,
        this.formatDate(invoice.issuedAt),
        this.formatDate(invoice.settledAt),
        invoice.itemSubtotal.toFixed(2),
        invoice.cgst.toFixed(2),
        invoice.sgst.toFixed(2),
        invoice.grandTotal.toFixed(2),
      ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => this.csvCell(cell)).join(','))
      .join('\r\n');
    const file = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const objectUrlApi = URL;
    const url = objectUrlApi.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `goody-foody-gst-report-${this.dateKey(new Date())}.csv`;
    link.click();
    window.setTimeout(() => objectUrlApi.revokeObjectURL(url), 1000);
  }

  exportCsvReport(): void {
    this.downloadCsvReport();
  }

  protected printTaxSummary(): void {
    window.print();
  }

  private buildRevenueBars(range: RevenueRange): RevenueBar[] {
    const today = this.startOfDay(new Date());
    const dates: Date[] = [];

    if (range === 'week') {
      for (let offset = 6; offset >= 0; offset -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        dates.push(date);
      }
    } else {
      for (let day = 1; day <= today.getDate(); day += 1) {
        dates.push(new Date(today.getFullYear(), today.getMonth(), day));
      }
    }

    const dailyTotals = new Map<string, { revenue: number; orders: number }>();
    for (const bill of this.orderService.settledBills()) {
      const key = this.dateKey(bill.settledAt);
      const current = dailyTotals.get(key) ?? { revenue: 0, orders: 0 };
      dailyTotals.set(key, {
        revenue: current.revenue + bill.amount,
        orders: current.orders + bill.orderCount,
      });
    }

    const totals = dates.map(
      (date) => dailyTotals.get(this.dateKey(date)) ?? { revenue: 0, orders: 0 },
    );
    const maxRevenue = Math.max(...totals.map((entry) => entry.revenue), 0);

    return dates.map((date, index) => {
      const key = this.dateKey(date);
      const total = totals[index];
      const label =
        range === 'week'
          ? new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date)
          : date.getDate() === 1 ||
              date.getDate() % 5 === 0 ||
              date.getDate() === dates.length
            ? String(date.getDate())
            : '';

      return {
        key,
        label,
        dateLabel: this.formatDate(date),
        revenue: roundCurrency(total.revenue),
        orderCount: total.orders,
        heightPercent: maxRevenue ? (total.revenue / maxRevenue) * 100 : 0,
      };
    });
  }

  private buildTopDishes(): DishPerformance[] {
    const sales = new Map<
      string,
      Omit<DishPerformance, 'sharePercent'>
    >();
    for (const invoice of this.orderService.invoices()) {
      for (const item of invoice.items) {
        const dish = sales.get(item.id) ?? {
          id: item.id,
          name: item.name,
          category: item.category ?? 'Signature',
          quantity: 0,
          revenue: 0,
          image: item.image,
        };
        dish.quantity += item.quantity;
        dish.revenue += item.amount;
        sales.set(item.id, dish);
      }
    }

    const totalRevenue = [...sales.values()].reduce(
      (total, dish) => total + dish.revenue,
      0,
    );
    return [...sales.values()]
      .sort(
        (left, right) =>
          right.quantity - left.quantity || right.revenue - left.revenue,
      )
      .slice(0, 5)
      .map((dish) => ({
        ...dish,
        revenue: roundCurrency(dish.revenue),
        sharePercent: totalRevenue
          ? (dish.revenue / totalRevenue) * 100
          : 0,
      }));
  }

  private toReportRow(invoice: SettledInvoice): TaxReportRow {
    return {
      invoiceNumber: invoice.invoiceNumber,
      period: this.formatDate(invoice.issuedAt),
      taxableBase: invoice.itemSubtotal,
      cgst: invoice.cgst,
      sgst: invoice.sgst,
      total: invoice.grandTotal,
    };
  }

  private createTrend(current: number, previous: number): Trend {
    if (previous === 0) {
      return current > 0
        ? { direction: 'up', label: 'New today' }
        : { direction: 'neutral', label: 'No prior-day data' };
    }

    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      label: `${change > 0 ? '+' : ''}${Math.round(change)}% vs yesterday`,
    };
  }

  private isToday(date: Date): boolean {
    return this.dateKey(date) === this.dateKey(new Date());
  }

  private isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.dateKey(date) === this.dateKey(yesterday);
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private csvCell(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
