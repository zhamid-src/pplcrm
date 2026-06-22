import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getUser();

  if (!user) return router.navigateByUrl('/signin');

  // /cancel-deletion is public, so this won't loop
  if (user.tenant_deletion_scheduled_at) {
    return router.navigateByUrl('/cancel-deletion');
  }

  return true;
};
