import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

export const loginGuard: CanActivateFn = () => {
  const user = inject(AuthService).getUser();

  // Only a fully-authenticated (verified) user belongs inside the app shell — send them to
  // /dashboard. An unverified user must be allowed to stay on /signin to see the "verify your
  // email" state: redirecting them to /dashboard bounces off authGuard (which kicks unverified
  // users back to /signin) into an infinite redirect loop that hangs the page.
  if (user?.email_verified) {
    return inject(Router).navigateByUrl('/dashboard');
  }

  return true;
};
