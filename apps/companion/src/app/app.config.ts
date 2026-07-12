import type { ApplicationConfig } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Loader } from '@googlemaps/js-api-loader';

import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: Loader,
      useFactory: () =>
        new Loader({
          apiKey: environment.googleMapsApiKey,
          libraries: ['marker'],
        }),
    },
    provideRouter(appRoutes),
    provideZonelessChangeDetection(),
  ],
};
