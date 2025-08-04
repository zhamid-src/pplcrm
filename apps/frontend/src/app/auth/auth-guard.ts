import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

/**
 * Route guard that ensures the user is authenticated before accessing the route.
 *
 * - If the user is authenticated (`AuthService.user()` returns a value), navigation is allowed.
 * - Otherwise, the user is redirected to the `/signin` page.
 *
 * @returns `true` if authenticated, or a `UrlTree` redirecting to `/signin` if not.
 */
export const authGuard: CanActivateFn = () =>
  inject(AuthService).getUser() ? true : inject(Router).navigateByUrl('/signin');
