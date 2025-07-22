import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

export const authGuard: CanActivateFn = () =>
  inject(AuthService).user() ? true : inject(Router).navigateByUrl('/signin');
