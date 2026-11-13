import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  it('validates newsletter email and clearly reports the demo submission state', async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.brand-establishment')?.textContent).toContain(
      'EST. 2026',
    );
    expect(element.querySelector('.location-copy')?.textContent).toContain(
      'Kolkata',
    );
    expect(element.querySelector('.location-copy')?.textContent).not.toContain(
      'Delhi',
    );
    const email = element.querySelector<HTMLInputElement>('#newsletter-email');
    const form = element.querySelector<HTMLFormElement>('form');

    expect(email).not.toBeNull();
    expect(form).not.toBeNull();
    email!.value = 'not-an-email';
    email!.dispatchEvent(new Event('input', { bubbles: true }));
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(element.querySelector('#newsletter-feedback')?.textContent).toContain(
      'valid email address',
    );

    email!.value = 'guest@example.com';
    email!.dispatchEvent(new Event('input', { bubbles: true }));
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(element.querySelector('#newsletter-feedback')?.textContent).toContain(
      'not connected in this demo',
    );
  });
});
