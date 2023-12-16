import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./services/auth.service";

export const authGuard: CanActivateFn = () => {
  return inject(AuthService).user()
    ? true
    : inject(Router).navigateByUrl("/signin");
};
