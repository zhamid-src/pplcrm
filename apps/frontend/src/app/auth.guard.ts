import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./services/auth.service";

export const authGuard: CanActivateFn = (/*_route, _state*/) => {
  if (AuthService.user) {
    return true;
  } else {
    const router = new Router();
    router.navigateByUrl("/signin");
    return false;
  }
};
