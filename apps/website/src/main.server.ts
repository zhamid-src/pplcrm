import { type BootstrapContext, bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app';
import { config } from './app/app.config.server';

// Angular 22 passes a BootstrapContext to the server bootstrap; it must be
// forwarded to bootstrapApplication or prerendering fails with NG0401.
const bootstrap = (context: BootstrapContext): Promise<unknown> => bootstrapApplication(AppComponent, config, context);

export default bootstrap;
