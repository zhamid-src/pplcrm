import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';

import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { getTestBed } from '@angular/core/testing';
import { vi } from 'vitest';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

(globalThis as any).jest = vi;
(globalThis as any).fetch = vi.fn().mockResolvedValue({
  ok: true,
  text: () => Promise.resolve('<svg></svg>'),
});
