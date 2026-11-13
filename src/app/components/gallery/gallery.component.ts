import { Component, HostListener, computed, signal } from '@angular/core';

type GalleryCategory =
  | 'All'
  | 'Royal Dining Hall'
  | 'Candlelight Terrace'
  | "Chef's Table"
  | 'Mixology Lounge';

interface GalleryPhoto {
  id: string;
  category: Exclude<GalleryCategory, 'All'>;
  title: string;
  caption: string;
  alt: string;
  imageUrl: string;
}

@Component({
  selector: 'app-gallery',
  standalone: true,
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss',
})
export class GalleryComponent {
  protected readonly categories: GalleryCategory[] = [
    'All',
    'Royal Dining Hall',
    'Candlelight Terrace',
    "Chef's Table",
    'Mixology Lounge',
  ];

  protected readonly photos: GalleryPhoto[] = [
    {
      id: 'royal-evening',
      category: 'Royal Dining Hall',
      title: 'The Royal Hall',
      caption: 'A golden hour, held a little longer.',
      alt: 'Warmly lit fine-dining room set for an intimate evening',
      imageUrl:
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=88',
    },
    {
      id: 'candlelit-table',
      category: 'Candlelight Terrace',
      title: 'By Candlelight',
      caption: 'Where every conversation finds its glow.',
      alt: 'Candlelit dining table with fine tableware',
      imageUrl:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=88',
    },
    {
      id: 'chef-artistry',
      category: "Chef's Table",
      title: 'A Study in Saffron',
      caption: 'The first beautiful detail of many.',
      alt: 'Artfully plated gourmet dish prepared by the chef',
      imageUrl:
        'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=88',
    },
    {
      id: 'mixology',
      category: 'Mixology Lounge',
      title: 'The Last Light',
      caption: 'A signature pour, made for slow evenings.',
      alt: 'Craft cocktail served in a glass at an elegant bar',
      imageUrl:
        'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=88',
    },
    {
      id: 'private-booth',
      category: 'Royal Dining Hall',
      title: 'A Private Moment',
      caption: 'The city outside. Your own world within.',
      alt: 'Private booth seating in a sophisticated restaurant',
      imageUrl:
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=88',
    },
    {
      id: 'plating-artistry',
      category: "Chef's Table",
      title: 'The Chef’s Canvas',
      caption: 'Season, colour and craft in perfect accord.',
      alt: 'Seasonal ingredients composed as a fine-dining plate',
      imageUrl:
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=88',
    },
    {
      id: 'terrace-at-dusk',
      category: 'Candlelight Terrace',
      title: 'An Open-Air Toast',
      caption: 'An evening breeze, a table set just for you.',
      alt: 'Rooftop dining terrace ready for an evening service',
      imageUrl:
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=88',
    },
    {
      id: 'cocktail-hour',
      category: 'Mixology Lounge',
      title: 'A Golden Hour Ritual',
      caption: 'A little sparkle before the first course.',
      alt: 'Elegant cocktail and bar setting in warm evening light',
      imageUrl:
        'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=88',
    },
  ];

  protected readonly activeCategory = signal<GalleryCategory>('All');
  protected readonly visiblePhotos = computed(() => {
    const category = this.activeCategory();
    return category === 'All'
      ? this.photos
      : this.photos.filter((photo) => photo.category === category);
  });
  protected readonly selectedPhoto = signal<GalleryPhoto | null>(null);

  protected selectCategory(category: GalleryCategory): void {
    this.activeCategory.set(category);
    this.closeLightbox();
  }

  protected openLightbox(photo: GalleryPhoto): void {
    this.selectedPhoto.set(photo);
  }

  protected closeLightbox(): void {
    this.selectedPhoto.set(null);
  }

  protected showNextPhoto(): void {
    this.movePhoto(1);
  }

  protected showPreviousPhoto(): void {
    this.movePhoto(-1);
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeydown(event: KeyboardEvent): void {
    if (!this.selectedPhoto()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeLightbox();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.showNextPhoto();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.showPreviousPhoto();
    }
  }

  private movePhoto(direction: -1 | 1): void {
    const photos = this.visiblePhotos();
    const currentPhoto = this.selectedPhoto();
    if (!currentPhoto || photos.length < 2) {
      return;
    }

    const currentIndex = photos.findIndex((photo) => photo.id === currentPhoto.id);
    const nextIndex = (currentIndex + direction + photos.length) % photos.length;
    this.selectedPhoto.set(photos[nextIndex]);
  }
}
