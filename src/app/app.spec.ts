import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { ApiService } from './api.service';

describe('App', () => {
  beforeEach(async () => {
    sessionStorage.removeItem('rms_authenticated');
    const apiStub = {
      currentUser: () => of({ id: 'admin-1', email: 'admin@example.com', name: 'Jordan Miller', role: 'admin' as const }),
      list: <T>() => of([] as T[]),
      settings: () => of({
        organizationName: 'Northstar Living',
        contactEmail: 'hello@example.com',
        currency: 'INR' as const,
        timezone: 'Asia/Kolkata',
        emailNotifications: true,
        maintenanceAlerts: true,
        darkMode: false,
      }),
      users: () => of([]),
      logout: () => of(void 0),
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: ApiService, useValue: apiStub }],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the resident operations heading', async () => {
    sessionStorage.setItem('rms_authenticated', 'true');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Good morning, Jordan');
  });

  it('should show the login page before the resident workspace', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-login')).toBeTruthy();
  });

  it('should require valid resident form data before saving', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as App & { residentForm: { invalid: boolean; controls: Record<string, { setValue: (value: string) => void }> }; saveResident: () => void };

    app.saveResident();
    expect(app.residentForm.invalid).toBe(true);
    app.residentForm.controls['fullName'].setValue('Avery Morgan');
    app.residentForm.controls['unit'].setValue('B-204');
    app.residentForm.controls['email'].setValue('avery@example.com');
    expect(app.residentForm.invalid).toBe(false);
  });

  it('should filter residents by name or unit', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as App & { residentSearch: { set: (value: string) => void }; filteredResidents: () => Array<{ name: string }> };

    app.residentSearch.set('B-204');
    expect(app.filteredResidents().map((resident) => resident.name)).toEqual(['Maya Thompson']);
  });
});
