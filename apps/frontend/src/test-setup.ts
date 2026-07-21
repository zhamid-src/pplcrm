import '@angular/compiler';
import '@angular/localize/init';
import '@analogjs/vite-plugin-angular/setup-vitest';

import { vi } from 'vitest';
(globalThis as any).jest = vi;

import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

(globalThis as any).fetch = vi.fn().mockResolvedValue({
  ok: true,
  text: () => Promise.resolve('<svg></svg>'),
});
