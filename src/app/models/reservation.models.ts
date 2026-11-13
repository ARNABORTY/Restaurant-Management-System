export type SeatingZone =
  | 'Main Royal Hall'
  | 'Private VIP Booth'
  | 'Candlelight Terrace';

export type SpecialOccasion =
  | 'None'
  | 'Birthday'
  | 'Anniversary'
  | 'Business Dinner'
  | 'Date Night';

export interface ReservationRequest {
  guestFullName: string;
  mobileNumber: string;
  emailAddress: string;
  guestCount: number;
  occasion: SpecialOccasion;
  chefNotes: string;
  welcomeDrink: boolean;
  date: string;
  time: string;
  zone: SeatingZone;
  tableId: number;
}

export interface ReservationBooking extends ReservationRequest {
  referenceId: string;
  tableNumber: string;
  bookedAt: Date;
}

export interface ReservationTableOption {
  id: number;
  tableNumber: string;
  zone: SeatingZone;
  seats: number;
}

export type ReservationResult =
  | { success: true; booking: ReservationBooking }
  | { success: false; reason: 'slot-full' | 'table-unavailable' | 'invalid-date' };
