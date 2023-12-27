import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { APP_INITIALIZER, ApplicationConfig } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { RouteReuseStrategy, provideRouter } from "@angular/router";
import { AuthService } from "@services/auth.service";
import { appRoutes } from "./app.routes";
import { CustomRouteReuseStrategy } from "./components/route.reuse.strategy";
import { httpInterceptor } from "./interceptors/http.interceptor";
import { ErrorCatchingInterceptor } from "./interceptors/httperrors.interceptor";

export function initSession(authService: AuthService) {
  return async () => {
    await authService.init();
  };
}

export function tokenGetter() {
  return localStorage.getItem("auth-token");
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    {
      provide: RouteReuseStrategy,
      useClass: CustomRouteReuseStrategy,
    },
    provideAnimations(),
    provideHttpClient(withInterceptors([httpInterceptor])),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorCatchingInterceptor,
      multi: true,
    },
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: initSession,
      deps: [AuthService],
    },
  ],
};
