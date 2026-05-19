import '@angular/compiler';
import '@analogjs/vite-plugin-angular/setup-vitest';

import { vi } from 'vitest';
(globalThis as any).jest = vi;
