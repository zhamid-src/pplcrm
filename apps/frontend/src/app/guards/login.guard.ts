import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "@services/auth.service";

export const loginGuard: CanActivateFn = () => {
  return inject(AuthService).user()
    ? inject(Router).navigateByUrl("/dashboard")
    : true;
};
