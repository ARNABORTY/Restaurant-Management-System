import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, StaffRole } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly passwordVisible = signal(false);
  protected readonly loginError = signal('');
  protected readonly submitted = signal(false);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly demoCredentials = this.auth.demoCredentials;

  protected fillDemo(role: StaffRole): void {
    const credential = this.demoCredentials.find((entry) => entry.role === role);
    if (!credential) {
      return;
    }

    this.form.setValue({
      email: credential.email,
      password: credential.password,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.loginError.set('');
    this.submitted.set(false);
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected submitLogin(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.loginError.set('');
    if (this.form.invalid) {
      return;
    }

    const role = this.auth.login(
      this.form.controls.email.value,
      this.form.controls.password.value,
    );
    if (!role) {
      this.loginError.set('Those credentials are not recognized. Please try again.');
      return;
    }

    void this.router.navigateByUrl(role === 'manager' ? '/dashboard' : '/kitchen');
  }

  protected showError(control: FormControl<string>): boolean {
    return control.invalid && (control.touched || this.submitted());
  }
}
