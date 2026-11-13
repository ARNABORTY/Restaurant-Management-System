import { Component } from '@angular/core';
import { GalleryComponent } from '../gallery/gallery.component';
import { HeroComponent } from '../hero/hero.component';
import { MenuComponent } from '../menu/menu.component';
import { ReservationComponent } from '../reservation/reservation.component';
import { TestimonialsComponent } from '../testimonials/testimonials.component';

@Component({
  imports: [
    HeroComponent,
    MenuComponent,
    GalleryComponent,
    TestimonialsComponent,
    ReservationComponent,
  ],
  selector: 'app-home',
  standalone: true,
  styleUrl: './home.component.scss',
  templateUrl: './home.component.html',
})
export class HomeComponent {}
