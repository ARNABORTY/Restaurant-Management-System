import { Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  protected readonly currentYear = new Date().getFullYear();
  protected readonly feedback = signal('');
  protected readonly submitted = signal(false);

  protected readonly newsletterForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected subscribe(): void {
    this.submitted.set(true);
    this.newsletterForm.markAllAsTouched();
    if (this.newsletterForm.invalid) {
      this.feedback.set('Please enter a valid email address.');
      return;
    }

    this.feedback.set(
      'Thank you for your interest. Newsletter sign-up is not connected in this demo.',
    );
    this.newsletterForm.reset({ email: '' });
    this.submitted.set(false);
  }

  protected clearFeedback(): void {
    this.feedback.set('');
  }

  protected get emailHasError(): boolean {
    const email = this.newsletterForm.controls.email;
    return email.invalid && (email.touched || this.submitted());
  }
}
