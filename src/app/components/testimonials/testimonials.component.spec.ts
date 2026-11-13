import { TestBed } from '@angular/core/testing';
import { TestimonialsComponent } from './testimonials.component';

describe('TestimonialsComponent', () => {
  it('advances with arrows and selects a review with carousel dots', async () => {
    await TestBed.configureTestingModule({
      imports: [TestimonialsComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestimonialsComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const quote = (): string =>
      element.querySelector('.testimonial-card blockquote')?.textContent?.trim() ?? '';

    const firstQuote = quote();
    element.querySelector<HTMLButtonElement>('[aria-label="Next review"]')?.click();
    fixture.detectChanges();
    expect(quote()).not.toBe(firstQuote);

    element.querySelector<HTMLButtonElement>('[aria-label="Show review 4"]')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.testimonial-card')?.textContent).toContain(
      'Charlotte Bennett',
    );
  });
});
