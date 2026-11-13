import { Injectable, computed, inject, signal } from '@angular/core';
import {
  ReservationBooking,
  ReservationRequest,
  ReservationResult,
  ReservationTableOption,
  SeatingZone,
} from '../models/reservation.models';
import { OrderService } from './order.service';

interface TimeSlotGroup {
  label: string;
  slots: string[];
}

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly orderService = inject(OrderService);
  private readonly reservationState = signal<ReservationBooking[]>([]);

  readonly reservations = this.reservationState.asReadonly();
  readonly bookingCount = computed(() => this.reservationState().length);

  readonly timeSlotGroups: TimeSlotGroup[] = [
    {
      label: 'Lunch Service',
      slots: ['12:30 PM', '1:30 PM', '2:30 PM'],
    },
    {
      label: 'Evening High-Tea / Tapas',
      slots: ['5:30 PM', '6:30 PM'],
    },
    {
      label: 'Royal Dinner',
      slots: ['7:30 PM', '8:30 PM', '9:30 PM', '10:30 PM'],
    },
  ];

  readonly seatingZones: SeatingZone[] = [
    'Main Royal Hall',
    'Private VIP Booth',
    'Candlelight Terrace',
  ];

  readonly tables: ReservationTableOption[] = [
    { id: 3, tableNumber: 'ROYAL-03', zone: 'Main Royal Hall', seats: 2 },
    { id: 5, tableNumber: 'ROYAL-05', zone: 'Main Royal Hall', seats: 4 },
    { id: 8, tableNumber: 'ROYAL-08', zone: 'Main Royal Hall', seats: 4 },
    { id: 1, tableNumber: 'VIP-01', zone: 'Private VIP Booth', seats: 2 },
    { id: 2, tableNumber: 'VIP-02', zone: 'Private VIP Booth', seats: 4 },
    { id: 7, tableNumber: 'VIP-07', zone: 'Private VIP Booth', seats: 12 },
    { id: 4, tableNumber: 'TERRACE-04', zone: 'Candlelight Terrace', seats: 6 },
    { id: 6, tableNumber: 'TERRACE-06', zone: 'Candlelight Terrace', seats: 2 },
  ];

  createReservation(request: ReservationRequest): ReservationResult {
    if (!this.isFutureDateTime(request.date, request.time)) {
      return { success: false, reason: 'invalid-date' };
    }

    if (
      this.availableTableCount(
        request.date,
        request.time,
        request.guestCount,
      ) === 0
    ) {
      return { success: false, reason: 'slot-full' };
    }

    const table = this.tables.find(
      (option) => option.id === request.tableId && option.zone === request.zone,
    );
    if (
      !table ||
      table.seats < request.guestCount ||
      this.isTableBooked(request.date, request.time, request.tableId)
    ) {
      return { success: false, reason: 'table-unavailable' };
    }

    const booking: ReservationBooking = {
      ...request,
      referenceId: this.createReference(),
      tableNumber: table.tableNumber,
      bookedAt: new Date(),
    };

    this.reservationState.update((reservations) => [...reservations, booking]);
    this.orderService.reserveTable(table.id, {
      referenceId: booking.referenceId,
      guestName: booking.guestFullName,
      date: booking.date,
      time: booking.time,
    });

    return { success: true, booking };
  }

  availableTableCount(date: string, time: string, guestCount = 1): number {
    if (!this.isFutureDateTime(date, time)) {
      return 0;
    }

    return this.tables.filter(
      (table) =>
        table.seats >= guestCount &&
        !this.isTableBooked(date, time, table.id),
    ).length;
  }

  availableSlotCount(date: string, guestCount = 1): number {
    return this.timeSlotGroups
      .flatMap((group) => group.slots)
      .filter(
        (time) => this.availableTableCount(date, time, guestCount) > 0,
      ).length;
  }

  getTablesForZone(zone: SeatingZone): ReservationTableOption[] {
    return this.tables.filter((table) => table.zone === zone);
  }

  isTableBooked(date: string, time: string, tableId: number): boolean {
    return this.reservationState().some(
      (reservation) =>
        reservation.date === date &&
        reservation.time === time &&
        reservation.tableId === tableId,
    );
  }

  private createReference(): string {
    let referenceId = '';
    do {
      referenceId = `GF-RES-${Math.floor(1000 + Math.random() * 9000)}`;
    } while (
      this.reservationState().some(
        (reservation) => reservation.referenceId === referenceId,
      )
    );
    return referenceId;
  }

  private isFutureDateTime(date: string, time: string): boolean {
    const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(time);
    if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return false;
    }

    const [, hourText, minuteText, meridiem] = match;
    let hour = Number(hourText) % 12;
    if (meridiem === 'PM') {
      hour += 12;
    }
    const slotDate = new Date(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)),
      hour,
      Number(minuteText),
    );
    const now = new Date();
    return (
      !Number.isNaN(slotDate.getTime()) &&
      slotDate.getTime() > now.getTime() &&
      date === this.dateKey(slotDate)
    );
  }

  private dateKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
