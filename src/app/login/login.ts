import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideArrowRight as ArrowRight, LucideBuilding2 as Building2, LucideEye as Eye, LucideEyeOff as EyeOff, LucideLockKeyhole as LockKeyhole, LucideMail as Mail, LucideShieldCheck as ShieldCheck } from '@lucide/angular';
import { ApiService, AuthUser } from '../api.service';

@Component({
  imports: [ReactiveFormsModule, ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  @Output() readonly authenticated = new EventEmitter<AuthUser>();

  protected readonly showPassword = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    const { email, password } = this.loginForm.getRawValue();
    this.api.login(email, password).subscribe({
      next: (user) => {
        this.isSubmitting.set(false);
        this.authenticated.emit(user);
      },
      error: (error: { error?: { error?: string } }) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.error ?? 'Sign-in failed. Check your connection and try again.');
      },
    });
  }
}
