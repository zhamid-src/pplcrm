import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getUser();

  if (!user) return router.navigateByUrl('/signin');

  // /cancel-deletion and /resume-account are public, so these won't loop
  if (user.tenant_deletion_scheduled_at) {
    return router.navigateByUrl('/cancel-deletion');
  }

  if (user.tenant_paused_at) {
    return router.navigateByUrl('/resume-account');
  }

  return true;
};
