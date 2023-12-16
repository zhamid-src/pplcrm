import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { ApplicationConfig, importProvidersFrom } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { JwtModule } from "@auth0/angular-jwt";
import { provideToastr } from "ngx-toastr";
import { appRoutes } from "./app.routes";
import { httpInterceptor } from "./interceptors/http.interceptor";
import { ErrorCatchingInterceptor } from "./interceptors/httperrors.interceptor";

export function tokenGetter() {
  return localStorage.getItem("auth-token");
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideAnimations(),
    provideHttpClient(withInterceptors([httpInterceptor])),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorCatchingInterceptor,
      multi: true,
    },
    provideToastr({
      preventDuplicates: true,
    }),
    importProvidersFrom(
      JwtModule.forRoot({
        config: {
          tokenGetter: tokenGetter,
          allowedDomains: ["example.com"],
          disallowedRoutes: ["http://example.com/examplebadroute/"],
        },
      }),
    ),
    provideHttpClient(withInterceptorsFromDi()),
  ],
};
