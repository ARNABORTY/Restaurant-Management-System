import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './services/auth.service';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem('goody-foody-demo-role');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Goody Foody brand', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('GOODY FOODY');
  });

  it('renders the shared footer on the public home page', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-footer'),
    ).not.toBeNull();
  });

  it('redirects guests from staff routes to the login page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/login');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-footer'),
    ).toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.login-card'),
    ).not.toBeNull();
  });

  it('closes the cart and removes shared overlays when navigating to login', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.dish-card .add-to-order')?.click();
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('.cart-button')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.drawer-shell')?.classList.contains('open')).toBe(
      true,
    );

    await router.navigateByUrl('/login');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('.site-header')).toBeNull();
    expect(compiled.querySelector('app-footer')).toBeNull();
    expect(compiled.querySelector('app-cart-drawer')).toBeNull();
    expect(compiled.querySelector('app-invoice-modal')).toBeNull();
  });

  it('keeps the dashboard manager-only while allowing chefs into the kitchen', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const auth = TestBed.inject(AuthService);

    expect(auth.login('chef@goodyfoody.in', 'Chef@2026')).toBe('chef');
    await router.navigateByUrl('/dashboard');
    expect(router.url).toBe('/kitchen');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-kds'),
    ).not.toBeNull();
  });

  it('allows a manager to open the protected dashboard', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const auth = TestBed.inject(AuthService);

    expect(auth.login('admin@goodyfoody.in', 'Royal@2026')).toBe('manager');
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/dashboard');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-dashboard'),
    ).not.toBeNull();
  });

  it('fills demo credentials and routes the chef to the kitchen', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login');
    fixture.detectChanges();

    const demoButtons = fixture.nativeElement.querySelectorAll(
      '.demo-option',
    ) as NodeListOf<HTMLButtonElement>;
    demoButtons[1].click();
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/kitchen');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-kds'),
    ).not.toBeNull();
  });

  it('shows a live cart count and item subtotal in the drawer', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.dish-card .add-to-order')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.cart-count')?.textContent?.trim()).toBe('1');

    compiled.querySelector<HTMLButtonElement>('.cart-button')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.drawer-shell')?.classList.contains('open')).toBe(
      true,
    );
    expect(compiled.querySelector('.bill-breakdown')?.textContent).toContain(
      '₹1,250.00',
    );
  });
});
