import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { Loader } from '@googlemaps/js-api-loader';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { appRoutes } from './app.routes';
import { CustomRouteReuseStrategy } from './components/route-reuse-strategy';
import { httpInterceptor } from './http-interceptor';
import { ErrorCatchingInterceptor } from './http-errors-interceptor';

export function initSession(authService: AuthService) {
  return async () => {
    await authService.init();
  };
}

export function tokenGetter() {
  return localStorage.getItem('auth-token');
}

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: Loader,
      useValue: new Loader({
        apiKey: 'AIzaSyDgTt8H7-BgZ05pW9G74fGcvBjAf2QN6WY',
        libraries: ['places'],
      }),
    },
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
    provideAppInitializer(() => {
      const initializerFn = initSession(inject(AuthService));
      return initializerFn();
    }),
  ],
};
