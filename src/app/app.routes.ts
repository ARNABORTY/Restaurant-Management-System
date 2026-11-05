import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
	{ path: 'login', children: [] },
	{ path: 'dashboard', canActivate: [authGuard], children: [] },
	{ path: 'residents', canActivate: [authGuard], children: [] },
	{ path: 'units', canActivate: [authGuard], children: [] },
	{ path: 'billing', canActivate: [authGuard], children: [] },
	{ path: 'maintenance', canActivate: [authGuard], children: [] },
	{ path: 'reports', canActivate: [authGuard], children: [] },
	{ path: 'order-menu', canActivate: [authGuard], children: [] },
	{ path: 'order-details', canActivate: [authGuard], children: [] },
	{ path: 'customer-details', canActivate: [authGuard], children: [] },
	{ path: 'settings', canActivate: [authGuard], children: [] },
	{ path: 'admin-controls', canActivate: [authGuard], children: [] },
	{ path: '**', redirectTo: 'dashboard' },
];
