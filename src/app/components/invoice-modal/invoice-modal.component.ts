import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Invoice } from '../../models/order.models';

@Component({
  imports: [CommonModule],
  selector: 'app-invoice-modal',
  standalone: true,
  templateUrl: './invoice-modal.component.html',
  styleUrl: './invoice-modal.component.scss',
})
export class InvoiceModalComponent {
  @Input({ required: true }) invoice!: Invoice;
  @Output() readonly closeRequested = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.close();
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected printInvoice(): void {
    window.print();
  }
}
