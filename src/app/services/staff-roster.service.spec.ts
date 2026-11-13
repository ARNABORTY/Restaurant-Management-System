import { StaffRosterService } from './staff-roster.service';

describe('StaffRosterService', () => {
  it('adds staff shifts and updates attendance', () => {
    const roster = new StaffRosterService();

    roster.addShift({
      staffName: 'Nisha Rao',
      role: 'Sommelier',
      shift: 'Evening Shift',
      station: 'Wine Cellar',
      attendance: 'On Duty',
    });

    expect(roster.roster().at(-1)).toMatchObject({
      id: 7,
      staffName: 'Nisha Rao',
      role: 'Sommelier',
      station: 'Wine Cellar',
      attendance: 'On Duty',
    });

    roster.setAttendance(7, 'Off');
    expect(roster.roster().at(-1)?.attendance).toBe('Off');
  });

  it('rejects attendance updates for unknown shifts', () => {
    const roster = new StaffRosterService();

    expect(() => roster.setAttendance(99, 'Off')).toThrow('Unknown staff shift');
  });
});
