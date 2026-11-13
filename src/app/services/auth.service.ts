import { computed, Injectable, signal } from '@angular/core';

export type StaffRole = 'manager' | 'chef';

export interface DemoCredential {
  role: StaffRole;
  label: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly sessionKey = 'goody-foody-demo-role';

  readonly demoCredentials: readonly DemoCredential[] = [
    {
      role: 'manager',
      label: 'General Manager / Admin',
      email: 'admin@goodyfoody.in',
      password: 'Royal@2026',
    },
    {
      role: 'chef',
      label: 'Executive Chef',
      email: 'chef@goodyfoody.in',
      password: 'Chef@2026',
    },
  ];

  private readonly roleState = signal<StaffRole | null>(this.readSession());
  readonly isLoggedIn = computed(() => this.roleState() !== null);
  readonly currentRole = this.roleState.asReadonly();

  login(email: string, password: string): StaffRole | null {
    const normalizedEmail = email.trim().toLowerCase();
    const credential = this.demoCredentials.find(
      (candidate) =>
        candidate.email === normalizedEmail && candidate.password === password,
    );
    if (!credential) {
      return null;
    }

    localStorage.setItem(AuthService.sessionKey, credential.role);
    this.roleState.set(credential.role);
    return credential.role;
  }

  logout(): void {
    localStorage.removeItem(AuthService.sessionKey);
    this.roleState.set(null);
  }

  getCurrentRole(): StaffRole | null {
    return this.roleState();
  }

  private readSession(): StaffRole | null {
    const storedRole = localStorage.getItem(AuthService.sessionKey);
    return storedRole === 'manager' || storedRole === 'chef'
      ? storedRole
      : null;
  }
}
