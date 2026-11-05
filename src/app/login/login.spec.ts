import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate the email and password before emitting sign-in', () => {
    const emit = vi.spyOn(component.authenticated, 'emit');

    component['submit']();
    expect(component['loginForm'].invalid).toBe(true);
    expect(emit).not.toHaveBeenCalled();
  });

  it('should authenticate against the API before emitting the signed-in user', () => {
    const emit = vi.spyOn(component.authenticated, 'emit');
    component['loginForm'].setValue({ email: 'manager@example.com', password: 'a-valid-test-password' });
    component['submit']();

    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ user: { id: 'manager-1', email: 'manager@example.com', name: 'Branch Manager', role: 'manager' } });

    expect(emit).toHaveBeenCalledWith({ id: 'manager-1', email: 'manager@example.com', name: 'Branch Manager', role: 'manager' });
  });
});
