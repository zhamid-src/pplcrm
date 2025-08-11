/**
 * @fileoverview Authentication guard for protecting routes that require user authentication.
 * Implements Angular's functional guard pattern to control access to protected routes.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

/**
 * Functional route guard that protects routes requiring authentication.
 *
 * This guard checks if a user is currently authenticated by querying the AuthService.
 * It implements Angular's CanActivateFn interface for modern functional guard patterns.
 *
 * **Behavior:**
 * - **Authenticated users**: Navigation proceeds normally
 * - **Unauthenticated users**: Automatically redirected to `/signin`
 *
 * @returns `true` if user is authenticated, otherwise navigates to signin page
 *
 * @example
 * ```typescript
 * // In app.routes.ts
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard]
 * }
 * ```
 *
 * @see {@link AuthService.getUser} for authentication state checking
 */
export const authGuard: CanActivateFn = () =>
  inject(AuthService).getUser() ? true : inject(Router).navigateByUrl('/signin');
