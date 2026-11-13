import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { FooterComponent } from './components/footer/footer.component';
import { InvoiceModalComponent } from './components/invoice-modal/invoice-modal.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { Invoice } from './models/order.models';
import { OrderService } from './services/order.service';

@Component({
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    CartDrawerComponent,
    InvoiceModalComponent,
    FooterComponent,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cartOpen = signal(false);
  protected readonly activeInvoice = signal<Invoice | null>(null);
  protected readonly isLoginPage = signal(false);

  constructor() {
    this.syncRouteShell(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.syncRouteShell(event.urlAfterRedirects));
  }

  protected openCart(): void {
    this.cartOpen.set(true);
  }

  protected closeCart(): void {
    this.cartOpen.set(false);
  }

  protected handleOrderPlaced(invoice: Invoice): void {
    this.orderService.receiveOrder(invoice);
    this.cartOpen.set(false);
    this.activeInvoice.set(invoice);
  }

  protected closeInvoice(): void {
    this.activeInvoice.set(null);
  }

  private syncRouteShell(url: string): void {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    this.isLoginPage.set(path === '/login');
    this.cartOpen.set(false);
    this.activeInvoice.set(null);
  }
}
