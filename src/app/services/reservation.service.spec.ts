import { TestBed } from '@angular/core/testing';
import { ReservationRequest } from '../models/reservation.models';
import { OrderService } from './order.service';
import { ReservationService } from './reservation.service';

describe('ReservationService', () => {
  let reservations: ReservationService;
  let orders: OrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    reservations = TestBed.inject(ReservationService);
    orders = TestBed.inject(OrderService);
  });

  it('creates a booking, reserves its dashboard table, and rejects duplicate table slots', () => {
    const request = createRequest(futureDateKey());
    const result = reservations.createReservation(request);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.booking.referenceId).toMatch(/^GF-RES-\d{4}$/);
    expect(reservations.bookingCount()).toBe(1);
    expect(reservations.isTableBooked(request.date, request.time, request.tableId)).toBe(
      true,
    );
    expect(orders.tables()[2]).toMatchObject({
      status: 'Reserved',
      reservation: {
        referenceId: result.booking.referenceId,
        guestName: 'Aarav Mehta',
        date: request.date,
        time: request.time,
      },
    });

    expect(reservations.createReservation(request)).toEqual({
      success: false,
      reason: 'table-unavailable',
    });
  });

  it('rejects past service times and tables below the requested party capacity', () => {
    expect(
      reservations.createReservation(createRequest('2000-01-01')),
    ).toEqual({ success: false, reason: 'invalid-date' });

    expect(
      reservations.createReservation({
        ...createRequest(futureDateKey()),
        guestCount: 3,
      }),
    ).toEqual({ success: false, reason: 'table-unavailable' });
  });
});

function createRequest(date: string): ReservationRequest {
  return {
    guestFullName: 'Aarav Mehta',
    mobileNumber: '9876543210',
    emailAddress: 'aarav@example.com',
    guestCount: 2,
    occasion: 'Date Night',
    chefNotes: '',
    welcomeDrink: false,
    date,
    time: '10:30 PM',
    zone: 'Main Royal Hall',
    tableId: 3,
  };
}

function futureDateKey(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
