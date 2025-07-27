import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { Loader } from '@googlemaps/js-api-loader';

import { appRoutes } from './app.routes';
import { CustomRouteReuseStrategy } from './components/route-reuse-strategy';
import { ErrorCatchingInterceptor } from './http-errors-interceptor';
import { httpInterceptor } from './http-interceptor';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

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
 * Sets up routing, HTTP interceptors, Google Maps, and app initialization.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    /**
     * Provides Google Maps API Loader globally with the 'places' library.
     */
    {
      provide: Loader,
      useValue: new Loader({
        apiKey: 'AIzaSyDgTt8H7-BgZ05pW9G74fGcvBjAf2QN6WY',
        libraries: ['places'],
      }),
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
     * Provides HTTP client with custom interceptors (request manipulation, headers, etc.).
     */
    provideHttpClient(withInterceptors([httpInterceptor])),

    /**
     * Registers global error-catching interceptor for all HTTP calls.
     */
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorCatchingInterceptor,
      multi: true,
    },

    /**
     * Allows DI-provided interceptors to be included dynamically.
     */
    provideHttpClient(withInterceptorsFromDi()),

    /**
     * Initializes the user session before app startup completes.
     */
    provideAppInitializer(() => {
      const initializerFn = initSession(inject(AuthService));
      return initializerFn();
    }),
  ],
};
