/**
 * @fileoverview Role guard for protecting routes that require admin or owner permissions.
 */
import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

export const roleGuard: CanActivateFn = async (_route, _state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  let user = auth.getUser();
  if (!user) {
    user = await auth.getCurrentUser();
  }
  if (!user) {
    return router.parseUrl('/signin');
  }

  if (user.role === 'user') {
    return router.parseUrl('/summary');
  }

  return true;
};
