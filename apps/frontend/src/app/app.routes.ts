import type { Routes } from '@angular/router';
import { NotFound } from './uxcommon/not-found/not-found';

import { authGuard } from './auth/auth-guard';
import { loginGuard } from './auth/login/login-guard';
import { NewPasswordPage } from './auth/new-password-page/new-password-page';
import { ResetPasswordPage } from './auth/reset-password-page/reset-password-page';
import { SignInPage } from './auth/signin-page/signin-page';
import { SignUpPage } from './auth/signup-page/signup-page';

/**
 * The main route configuration for the application.
 *
 * Includes routing for authentication, dashboard, and fallback routes.
 */
export const appRoutes: Routes = [
  /**
   * Default redirect to summary page inside the dashboard.
   */
  { path: '', redirectTo: 'summary', pathMatch: 'full' },

  /**
   * Auth pages (sign-in, sign-up, reset password).
   */
  { path: 'signin', component: SignInPage, canActivate: [loginGuard] },
  { path: 'signup', component: SignUpPage },
  { path: 'resetpassword', component: ResetPasswordPage },
  { path: 'newpassword', component: NewPasswordPage },

  /**
   * Main dashboard protected by authGuard.
   */
  {
    path: '',
    canActivate: [authGuard],
    component: () =>
      import('./layout/dashboards/dashboard').then((m) => m.Dashboard),
    children: () =>
      import('./dashboard.routes').then((m) => m.dashboardRoutes),
  },

  /**
   * Fallback route for undefined paths.
   */
  {
    path: '**',
    component: NotFound,
  },
];
