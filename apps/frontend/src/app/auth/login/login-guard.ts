/**
 * @fileoverview Login guard for preventing authenticated users from accessing auth-related routes.
 * Implements reverse authentication logic to redirect logged-in users away from login pages.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

/**
 * Functional route guard that prevents authenticated users from accessing auth pages.
 *
 * This guard implements "reverse authentication" logic - it blocks access to routes
 * that should only be available to unauthenticated users (like login, signup, etc.).
 *
 * **Use Cases:**
 * - Protecting `/signin` route from logged-in users
 * - Protecting `/signup` route from logged-in users
 * - Protecting password reset pages from logged-in users
 *
 * **Behavior:**
 * - **Unauthenticated users**: Can access the route (e.g., login page)
 * - **Authenticated users**: Redirected to `/console/summary` dashboard
 *
 * @returns `true` if user is not authenticated, otherwise navigates to dashboard
 *
 * @example
 * ```typescript
 * // In app.routes.ts
 * {
 *   path: 'signin',
 *   component: SigninComponent,
 *   canActivate: [loginGuard] // Prevents logged-in users from seeing login
 * }
 * ```
 *
 * @see {@link authGuard} for the opposite behavior (protecting authenticated routes)
 */
export const loginGuard: CanActivateFn = () =>
  inject(AuthService).getUser() ? inject(Router).navigateByUrl('/console/summary') : true;
