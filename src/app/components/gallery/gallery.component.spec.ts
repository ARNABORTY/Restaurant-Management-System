import { TestBed } from '@angular/core/testing';
import { GalleryComponent } from './gallery.component';

describe('GalleryComponent', () => {
  it('filters photographs and supports lightbox arrow and Escape keys', async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(GalleryComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.photo-card').length).toBe(8);

    element
      .querySelector<HTMLButtonElement>('.filter-pill:nth-child(2)')
      ?.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.photo-card').length).toBe(2);

    element.querySelector<HTMLButtonElement>('.photo-card')?.click();
    fixture.detectChanges();
    const firstTitle = element.querySelector('.lightbox figcaption strong')?.textContent;
    expect(firstTitle).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(element.querySelector('.lightbox figcaption strong')?.textContent).not.toBe(
      firstTitle,
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(element.querySelector('.lightbox-backdrop')).toBeNull();
  });
});
