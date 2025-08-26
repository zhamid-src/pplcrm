import type { Routes } from '@angular/router';

import { authGuard } from './auth/auth-guard';
import { loginGuard } from './auth/login/login-guard';

export const appRoutes = [
  // Default redirect to summary inside the dashboard shell
  { path: '', redirectTo: 'summary', pathMatch: 'full' },

  // Auth pages
  {
    path: 'signin',
    canActivate: [loginGuard],
    loadComponent: () => import('./auth/signin-page/signin-page').then((m) => m.SignInPage),
  },
  {
    path: 'signup',
    loadComponent: () => import('./auth/signup-page/signup-page').then((m) => m.SignUpPage),
  },
  {
    path: 'resetpassword',
    loadComponent: () => import('./auth/reset-password-page/reset-password-page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'newpassword',
    loadComponent: () => import('./auth/new-password-page/new-password-page').then((m) => m.NewPasswordPage),
  },

  // Main dashboard shell + children (protected)
  {
    path: '',
    canActivate: [authGuard],
    // optionally also: canActivateChild: [authGuard],
    loadComponent: () => import('./layout/dashboards/dashboard').then((m) => m.Dashboard),
    loadChildren: () => import('./dashboard.routes').then((m) => m.dashboardRoutes),
  },

  // Fallback
  {
    path: '**',
    loadComponent: () => import('./uxcommon/components/not-found/not-found').then((m) => m.NotFound),
  },
] as const satisfies Routes;
