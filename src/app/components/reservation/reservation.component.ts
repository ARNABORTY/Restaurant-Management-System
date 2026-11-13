import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ReservationBooking,
  ReservationResult,
  ReservationTableOption,
  SeatingZone,
  SpecialOccasion,
} from '../../models/reservation.models';
import { ReservationService } from '../../services/reservation.service';

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayName: string;
  dayNumber: string;
  monthName: string;
}

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-reservation',
  standalone: true,
  templateUrl: './reservation.component.html',
  styleUrl: './reservation.component.scss',
})
export class ReservationComponent {
  private readonly reservationService = inject(ReservationService);

  protected readonly calendarDays = this.createCalendarWeek();
  protected readonly slotGroups = this.reservationService.timeSlotGroups;
  protected readonly seatingZones = this.reservationService.seatingZones;
  protected readonly guestCounts = Array.from({ length: 12 }, (_, index) => index + 1);
  protected readonly occasions: SpecialOccasion[] = [
    'None',
    'Birthday',
    'Anniversary',
    'Business Dinner',
    'Date Night',
  ];
  protected readonly submitted = signal(false);
  protected readonly bookingError = signal('');
  protected readonly confirmedBooking = signal<ReservationBooking | null>(null);

  protected readonly form = new FormGroup({
    guestFullName: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/\S/),
      ],
    }),
    mobileNumber: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^[6-9]\d{9}$/),
      ],
    }),
    emailAddress: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    guestCount: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(12)],
    }),
    occasion: new FormControl<SpecialOccasion>('None', { nonNullable: true }),
    chefNotes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(400)],
    }),
    welcomeDrink: new FormControl(false, { nonNullable: true }),
    date: new FormControl(this.dateKey(new Date()), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    time: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    zone: new FormControl<SeatingZone>('Main Royal Hall', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    tableId: new FormControl<number | null>(null, Validators.required),
  });

  protected showError(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  protected get selectedDate(): string {
    return this.form.controls.date.value;
  }

  protected get selectedTime(): string {
    return this.form.controls.time.value;
  }

  protected get selectedZone(): SeatingZone {
    return this.form.controls.zone.value;
  }

  protected get guestCount(): number {
    return this.form.controls.guestCount.value;
  }

  protected slotsAvailable(date: string): number {
    return this.reservationService.availableSlotCount(date, this.guestCount);
  }

  protected tablesAvailable(time: string): number {
    return this.reservationService.availableTableCount(
      this.selectedDate,
      time,
      this.guestCount,
    );
  }

  protected tablesForSelectedZone(): ReservationTableOption[] {
    return this.reservationService.getTablesForZone(this.selectedZone);
  }

  protected tableAvailability(table: ReservationTableOption): string {
    if (!this.selectedTime) {
      return 'Choose a time';
    }
    if (table.seats < this.guestCount) {
      return `Up to ${table.seats} guests`;
    }
    return this.reservationService.isTableBooked(
      this.selectedDate,
      this.selectedTime,
      table.id,
    )
      ? 'Reserved'
      : 'Available';
  }

  protected selectDate(date: string): void {
    this.form.controls.date.setValue(date);
    this.form.controls.time.setValue('');
    this.form.controls.tableId.setValue(null);
    this.bookingError.set('');
  }

  protected selectTime(time: string): void {
    if (this.tablesAvailable(time) === 0) {
      return;
    }

    this.form.controls.time.setValue(time);
    this.form.controls.tableId.setValue(null);
    this.bookingError.set('');
  }

  protected selectZone(zone: SeatingZone): void {
    this.form.controls.zone.setValue(zone);
    this.form.controls.tableId.setValue(null);
  }

  protected selectTable(table: ReservationTableOption): void {
    if (this.tableAvailability(table) !== 'Available') {
      return;
    }

    this.form.controls.tableId.setValue(table.id);
    this.form.controls.tableId.markAsTouched();
    this.bookingError.set('');
  }

  protected changeGuestCount(): void {
    this.form.controls.tableId.setValue(null);
    if (this.selectedTime && this.tablesAvailable(this.selectedTime) === 0) {
      this.form.controls.time.setValue('');
    }
  }

  protected submitReservation(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.bookingError.set('');
    if (this.form.invalid) {
      return;
    }

    const values = this.form.getRawValue();
    if (values.tableId === null) {
      return;
    }

    const result = this.reservationService.createReservation({
      ...values,
      tableId: values.tableId,
    });

    if (result.success) {
      this.confirmedBooking.set(result.booking);
      return;
    }

    this.bookingError.set(this.bookingFailureMessage(result));
    this.form.controls.tableId.setValue(null);
  }

  protected closePass(): void {
    const date = this.selectedDate;
    this.confirmedBooking.set(null);
    this.form.reset({
      guestFullName: '',
      mobileNumber: '',
      emailAddress: '',
      guestCount: 2,
      occasion: 'None',
      chefNotes: '',
      welcomeDrink: false,
      date,
      time: '',
      zone: 'Main Royal Hall',
      tableId: null,
    });
    this.submitted.set(false);
    this.bookingError.set('');
  }

  protected downloadCalendarPass(booking: ReservationBooking): void {
    const start = this.calendarTimestamp(booking.date, booking.time);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Goody Foody//Fine Dining Reservations//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${this.escapeCalendarText(booking.referenceId)}@goodyfoody.example`,
      `DTSTAMP:${this.utcTimestamp(new Date())}`,
      `DTSTART:${this.utcTimestamp(start)}`,
      `DTEND:${this.utcTimestamp(end)}`,
      `SUMMARY:Goody Foody reservation - ${this.escapeCalendarText(booking.zone)}`,
      `LOCATION:${this.escapeCalendarText(`${booking.tableNumber}, Goody Foody, Kolkata`)}`,
      `DESCRIPTION:${this.escapeCalendarText(`Booking ${booking.referenceId} for ${booking.guestFullName}, ${booking.guestCount} guests.`)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    const file = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${booking.referenceId}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected formatBookingDate(dateKey: string): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, day));
  }

  @HostListener('document:keydown.escape')
  protected closePassOnEscape(): void {
    if (this.confirmedBooking()) {
      this.closePass();
    }
  }

  private createCalendarWeek(): CalendarDay[] {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + index,
      );
      return {
        date,
        dateKey: this.dateKey(date),
        dayName: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
        dayNumber: new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(date),
        monthName: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date),
      };
    });
  }

  private dateKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private bookingFailureMessage(result: Extract<ReservationResult, { success: false }>): string {
    switch (result.reason) {
      case 'invalid-date':
        return 'Please choose a future date and service time.';
      case 'slot-full':
        return 'This service is fully booked for your party size. Please choose another time.';
      case 'table-unavailable':
        return 'That table was just reserved. Please select another available table.';
    }
  }

  private calendarTimestamp(date: string, time: string): Date {
    const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(time);
    if (!match) {
      throw new Error(`Unsupported reservation time: ${time}`);
    }

    let hour = Number(match[1]) % 12;
    if (match[3] === 'PM') {
      hour += 12;
    }
    const hourText = String(hour).padStart(2, '0');
    return new Date(`${date}T${hourText}:${match[2]}:00+05:30`);
  }

  private utcTimestamp(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private escapeCalendarText(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }
}
