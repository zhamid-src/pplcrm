import type { ApplicationConfig } from '@angular/core';
import { ErrorHandler, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { ENVIRONMENT } from './environment-token';
import {
  PreloadAllModules,
  RouteReuseStrategy,
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Loader } from '@googlemaps/js-api-loader';
import { environment } from '../environments/environment';

import { appRoutes } from './app.routes';
import { AppTitleStrategy } from './services/tab-title.service';
import { CustomRouteReuseStrategy } from './routing/route-reuse-strategy';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { jsendInterceptor } from './services/jsend.interceptor';
import { GlobalErrorHandler } from './services/global-error-handler';

export function initSession(authService: AuthService) {
  return async () => {
    await authService.init();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ENVIRONMENT, useValue: environment },
    provideTanStackQuery(new QueryClient()),
    {
      provide: Loader,
      useFactory: () => {
        const env = inject(ENVIRONMENT);
        return new Loader({
          apiKey: env.googleMapsApiKey,
          libraries: ['places'],
        });
      },
    },

    {
      provide: RouteReuseStrategy,
      useClass: CustomRouteReuseStrategy,
    },
    {
      provide: TitleStrategy,
      useClass: AppTitleStrategy,
    },
    // Preload lazy route chunks in the background after first paint so slow
    // connections don't stall on chunk download at click time.
    provideRouter(appRoutes, withComponentInputBinding(), withPreloading(PreloadAllModules)),

    provideZonelessChangeDetection(),

    provideAppInitializer(() => {
      const initializerFn = initSession(inject(AuthService));
      return initializerFn();
    }),

    provideHttpClient(withInterceptors([jsendInterceptor])),

    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
