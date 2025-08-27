/**
 * @fileoverview Authentication guard for protecting routes that require user authentication.
 * Implements Angular's functional guard pattern to control access to protected routes.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

export const authGuard: CanActivateFn = () =>
  inject(AuthService).getUser() ? true : inject(Router).navigateByUrl('/signin');
