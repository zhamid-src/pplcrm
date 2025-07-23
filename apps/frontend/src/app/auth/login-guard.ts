import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

/**
 * Login guard to prevent authenticated users from accessing routes meant for unauthenticated users
 * (e.g., sign-in or sign-up pages). If a user is already logged in, redirects them to the dashboard.
 *
 * @returns `true` if the user is not authenticated and can proceed to the route,
 *          otherwise a navigation redirect to `/console/summary`.
 */
export const loginGuard: CanActivateFn = () =>
  inject(AuthService).user() ? inject(Router).navigateByUrl('/console/summary') : true;
