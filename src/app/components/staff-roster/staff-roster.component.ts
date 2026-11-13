import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AttendanceStatus,
  ShiftPeriod,
  StaffRosterService,
} from '../../services/staff-roster.service';

@Component({
  selector: 'app-staff-roster',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './staff-roster.component.html',
  styleUrl: './staff-roster.component.scss',
})
export class StaffRosterComponent {
  private readonly rosterService = inject(StaffRosterService);

  protected readonly roster = this.rosterService.roster;
  protected readonly addShiftOpen = signal(false);
  protected readonly onDutyCount = computed(
    () => this.roster().filter((staff) => staff.attendance === 'On Duty').length,
  );
  protected readonly roles = [
    'Executive Chef',
    'Sous Chef',
    'Sommelier',
    'Head Host',
    'Floor Waiter',
    'Mixologist',
    'Restaurant Manager',
  ];
  protected readonly stations = [
    'Kitchen Line 1',
    'Kitchen Line 2',
    'Wine Cellar',
    'Main Royal Hall',
    'VIP Dining',
    'Candlelight Terrace',
    'Mixology Lounge',
  ];
  protected readonly attendanceOptions: AttendanceStatus[] = [
    'On Duty',
    'Off',
    'On Leave',
  ];

  protected readonly form = new FormGroup({
    staffName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    role: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    shift: new FormControl<ShiftPeriod>('Evening Shift', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    station: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    attendance: new FormControl<AttendanceStatus>('On Duty', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected openAddShift(): void {
    this.addShiftOpen.set(true);
  }

  protected closeAddShift(): void {
    this.addShiftOpen.set(false);
  }

  protected submitShift(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.rosterService.addShift(this.form.getRawValue());
    this.form.reset({
      staffName: '',
      role: '',
      shift: 'Evening Shift',
      station: '',
      attendance: 'On Duty',
    });
    this.closeAddShift();
  }

  protected shiftTiming(shift: ShiftPeriod): string {
    return shift === 'Morning Shift'
      ? '11:00 AM – 04:00 PM'
      : '06:00 PM – 11:30 PM';
  }

  protected attendanceClass(attendance: AttendanceStatus): string {
    return attendance.toLowerCase().replace(' ', '-');
  }

  protected updateAttendance(id: number, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    const attendance = target.value;
    if (
      attendance === 'On Duty' ||
      attendance === 'Off' ||
      attendance === 'On Leave'
    ) {
      this.rosterService.setAttendance(id, attendance);
    }
  }
}
