import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { ApplicationConfig } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { provideToastr } from "ngx-toastr";
import { appRoutes } from "./app.routes";
import { httpInterceptor } from "./http.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideAnimations(),
    provideHttpClient(withInterceptors([httpInterceptor])),
    provideToastr({
      preventDuplicates: true,
    }),
  ],
};
