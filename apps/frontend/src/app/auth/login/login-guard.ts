import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

export const loginGuard: CanActivateFn = () =>
  inject(AuthService).getUser() ? inject(Router).navigateByUrl('/summary') : true;
