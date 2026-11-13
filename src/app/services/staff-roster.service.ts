import { Injectable, signal } from '@angular/core';

export type AttendanceStatus = 'On Duty' | 'Off' | 'On Leave';
export type ShiftPeriod = 'Morning Shift' | 'Evening Shift';

export interface StaffShift {
  id: number;
  staffName: string;
  role: string;
  shift: ShiftPeriod;
  station: string;
  attendance: AttendanceStatus;
}

export type NewStaffShift = Omit<StaffShift, 'id'>;

const INITIAL_ROSTER: StaffShift[] = [
  {
    id: 1,
    staffName: 'Mira Kapoor',
    role: 'Executive Chef',
    shift: 'Evening Shift',
    station: 'Kitchen Line 1',
    attendance: 'On Duty',
  },
  {
    id: 2,
    staffName: 'Rohan Mehra',
    role: 'Sommelier',
    shift: 'Evening Shift',
    station: 'Wine Cellar',
    attendance: 'On Duty',
  },
  {
    id: 3,
    staffName: 'Anaya Bose',
    role: 'Head Host',
    shift: 'Evening Shift',
    station: 'Main Royal Hall',
    attendance: 'On Duty',
  },
  {
    id: 4,
    staffName: 'Dev Patel',
    role: 'Floor Waiter',
    shift: 'Evening Shift',
    station: 'VIP Dining',
    attendance: 'On Duty',
  },
  {
    id: 5,
    staffName: 'Isha Banerjee',
    role: 'Floor Waiter',
    shift: 'Morning Shift',
    station: 'Candlelight Terrace',
    attendance: 'Off',
  },
  {
    id: 6,
    staffName: 'Kabir Singh',
    role: 'Mixologist',
    shift: 'Evening Shift',
    station: 'Mixology Lounge',
    attendance: 'On Leave',
  },
];

@Injectable({ providedIn: 'root' })
export class StaffRosterService {
  private readonly rosterState = signal(INITIAL_ROSTER);
  readonly roster = this.rosterState.asReadonly();

  addShift(shift: NewStaffShift): void {
    const nextId =
      this.rosterState().reduce((highestId, entry) => Math.max(highestId, entry.id), 0) +
      1;
    this.rosterState.update((roster) => [...roster, { ...shift, id: nextId }]);
  }

  setAttendance(id: number, attendance: AttendanceStatus): void {
    if (!this.rosterState().some((entry) => entry.id === id)) {
      throw new Error(`Unknown staff shift: ${id}`);
    }

    this.rosterState.update((roster) =>
      roster.map((entry) => (entry.id === id ? { ...entry, attendance } : entry)),
    );
  }
}
