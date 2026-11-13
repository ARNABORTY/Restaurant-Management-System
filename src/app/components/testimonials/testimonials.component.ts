import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

interface GuestTestimonial {
  id: string;
  quote: string;
  guestName: string;
  city: string;
  occasion: string;
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.scss',
})
export class TestimonialsComponent {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly testimonials: GuestTestimonial[] = [
    {
      id: 'mumbai-anniversary',
      quote:
        'The room glowed, the service felt wonderfully personal, and each course arrived like a small surprise. We will remember our anniversary here for years.',
      guestName: 'Ananya & Rohan Mehta',
      city: 'Mumbai',
      occasion: 'Anniversary Dinner',
    },
    {
      id: 'kolkata-tasting',
      quote:
        'A remarkable conversation between familiar Indian flavours and a bold, modern kitchen. The chef’s tasting menu was thoughtful from the very first bite.',
      guestName: 'Ishita Banerjee',
      city: 'Kolkata',
      occasion: 'Chef’s Tasting Menu',
    },
    {
      id: 'delhi-family',
      quote:
        'A rare place that makes an occasion feel special without ever feeling formal. The team remembered every detail and made our family feel at home.',
      guestName: 'Kabir Khanna',
      city: 'Kolkata',
      occasion: 'Family Celebration',
    },
    {
      id: 'london-visit',
      quote:
        'An unforgettable Kolkata evening: generous hospitality, beautiful ingredients and a setting that quietly takes your breath away. Worth crossing an ocean for.',
      guestName: 'Charlotte Bennett',
      city: 'London',
      occasion: 'A Night in Kolkata',
    },
    {
      id: 'bengaluru-date',
      quote:
        'From the first welcome drink to the last spoon of dessert, everything felt considered. The candlelit terrace is now our favourite reason to visit Kolkata.',
      guestName: 'Mira & Dev Rao',
      city: 'Bengaluru',
      occasion: 'Date Night',
    },
  ];

  protected readonly activeIndex = signal(0);
  protected readonly isPaused = signal(false);
  protected readonly activeTestimonial = computed(
    () => this.testimonials[this.activeIndex()],
  );
  protected readonly stars = [1, 2, 3, 4, 5];

  constructor() {
    interval(7000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.isPaused()) {
          this.showNext();
        }
      });
  }

  protected showNext(): void {
    this.activeIndex.update((index) => (index + 1) % this.testimonials.length);
  }

  protected showPrevious(): void {
    this.activeIndex.update(
      (index) => (index - 1 + this.testimonials.length) % this.testimonials.length,
    );
  }

  protected selectTestimonial(index: number): void {
    this.activeIndex.set(index);
  }

  protected pauseAutoplay(): void {
    this.isPaused.set(true);
  }

  protected resumeAutoplay(): void {
    this.isPaused.set(false);
  }
}
