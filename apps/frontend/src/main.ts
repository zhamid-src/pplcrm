import { bootstrapApplication } from '@angular/platform-browser';
import 'cally';

import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
