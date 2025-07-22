import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

export const loginGuard: CanActivateFn = () =>
  inject(AuthService).user() ? inject(Router).navigateByUrl('/console/summary') : true;
