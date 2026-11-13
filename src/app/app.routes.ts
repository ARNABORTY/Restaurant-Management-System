import { Routes } from '@angular/router';
import { authGuard, managerGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home.component').then(
        (component) => component.HomeComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(
        (component) => component.LoginComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, managerGuard],
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(
        (component) => component.DashboardComponent,
      ),
  },
  {
    path: 'kitchen',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/kds/kds.component').then(
        (component) => component.KdsComponent,
      ),
  },
  { path: 'kds', redirectTo: 'kitchen', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
