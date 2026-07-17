import type { ApplicationConfig } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, TitleStrategy, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { appRoutes } from './app.routes';
import { SeoTitleStrategy } from './ui/seo';

export const appConfig: ApplicationConfig = {
  providers: [
    // Hydrate the prerendered (SSG) HTML instead of throwing it away and
    // re-rendering on the client.
    provideClientHydration(withEventReplay()),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      // Jump to top on navigation, and honour #fragment anchors.
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideZonelessChangeDetection(),
    // Keep title + meta description + canonical + per-page OG in sync per route.
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
  ],
};
