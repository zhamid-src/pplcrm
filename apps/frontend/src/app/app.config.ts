import {
  ApplicationConfig,
  ErrorHandler,
  Environment,
  inject,
  provideAppInitializer,
  provideEnvironment,
  provideZonelessChangeDetection,
} from '@angular/core';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Loader } from '@googlemaps/js-api-loader';
import { environment } from '../environments/environment';

import { appRoutes } from './app.routes';
import { CustomRouteReuseStrategy } from './components/route-reuse-strategy';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { jsendInterceptor } from '@services/jsend.interceptor';
import { GlobalErrorHandler } from '@services/global-error-handler';

/**
 * Initializes the user session during app startup.
 * Used with `provideAppInitializer` to ensure AuthService runs before the app loads.
 *
 * @param authService - The authentication service to initialize.
 * @returns An async function to initialize session.
 */
export function initSession(authService: AuthService) {
  return async () => {
    await authService.init();
  };
}

/**
 * Returns the current stored auth token from localStorage.
 * Used by interceptors or JWT-based auth libraries.
 *
 * @returns The auth token or null if not found.
 */
export function tokenGetter() {
  return localStorage.getItem('auth-token');
}

/**
 * Application configuration for the Angular standalone app.
 *
 * This configuration object sets up all the essential providers and services needed
 * for the application to function properly. It includes:
 * - Google Maps API integration with Places library
 * - Application routing with custom route reuse strategy
 * - Zoneless change detection for improved performance
 * - Authentication service initialization during app startup
 *
 * @see {@link https://angular.dev/guide/standalone-components#configuring-dependency-injection}
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideEnvironment(environment),
    /**
     * Provides Google Maps API Loader globally with the 'places' library.
     */
    {
      provide: Loader,
      useFactory: () => {
        const env = inject(Environment);
        return new Loader({
          apiKey: env.googleMapsApiKey,
          libraries: ['places'],
        });
      },
    },

    /**
     * Provides app-level routing.
     */
    provideRouter(appRoutes),

    /**
     * Overrides Angular's default route reuse strategy with a custom one.
     */
    {
      provide: RouteReuseStrategy,
      useClass: CustomRouteReuseStrategy,
    },

    /**
     * Make it zoneless
     */
    provideZonelessChangeDetection(),

    /**
     * Initializes the user session before app startup completes.
     */
    provideAppInitializer(() => {
      const initializerFn = initSession(inject(AuthService));
      return initializerFn();
    }),

    /** HTTP client with JSend interceptor */
    provideHttpClient(withInterceptors([jsendInterceptor])),

    /** Global error handler */
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
