import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export type UserRole = 'admin' | 'manager' | 'staff';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AdminUser extends AuthUser {
  active: boolean;
  createdAt?: string;
}

export interface AuditEvent {
  id: string;
  actor: string | null;
  action: string;
  resource: string;
  recordId: string | null;
  createdAt: string;
}

export interface WorkspaceSettings {
  organizationName: string;
  contactEmail: string;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  timezone: string;
  emailNotifications: boolean;
  maintenanceAlerts: boolean;
  darkMode: boolean;
}

export type DataResource = 'residents' | 'units' | 'invoices' | 'maintenance' | 'menu' | 'orders' | 'customers';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  login(email: string, password: string): Observable<AuthUser> {
    return this.http.post<{ user: AuthUser }>(`${this.baseUrl}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(map((response) => response.user));
  }

  currentUser(): Observable<AuthUser> {
    return this.http.get<{ user: AuthUser }>(`${this.baseUrl}/auth/me`, { withCredentials: true })
      .pipe(map((response) => response.user));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout`, null, { withCredentials: true });
  }

  settings(): Observable<WorkspaceSettings> {
    return this.http.get<WorkspaceSettings>(`${this.baseUrl}/settings`, { withCredentials: true });
  }

  saveSettings(settings: WorkspaceSettings): Observable<WorkspaceSettings> {
    return this.http.put<WorkspaceSettings>(`${this.baseUrl}/settings`, settings, { withCredentials: true });
  }

  users(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/admin/users`, { withCredentials: true });
  }

  auditEvents(): Observable<AuditEvent[]> {
    return this.http.get<AuditEvent[]>(`${this.baseUrl}/admin/audit`, { withCredentials: true });
  }

  addUser(user: Pick<AdminUser, 'email' | 'name' | 'role'> & { password: string }): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.baseUrl}/admin/users`, user, { withCredentials: true });
  }

  updateUser(id: string, update: { role?: UserRole; active?: boolean }): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/admin/users/${encodeURIComponent(id)}`, update, { withCredentials: true });
  }

  list<T>(resource: DataResource): Observable<T[]> {
    return this.http.get<T[]>(`${this.baseUrl}/data/${resource}`, { withCredentials: true });
  }

  create<T>(resource: DataResource, record: Partial<T>): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/data/${resource}`, record, { withCredentials: true });
  }

  update<T>(resource: DataResource, id: string, patch: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/data/${resource}/${encodeURIComponent(id)}`, patch, { withCredentials: true });
  }

  delete(resource: DataResource, id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/data/${resource}/${encodeURIComponent(id)}`, { withCredentials: true });
  }
}
