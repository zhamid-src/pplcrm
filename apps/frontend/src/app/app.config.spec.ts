import { ErrorHandler } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { vi } from 'vitest';
import { appConfig, initSession } from './app.config';
import type { AuthService } from './auth/auth-service';
import { CustomRouteReuseStrategy } from './routing/route-reuse-strategy';
import { GlobalErrorHandler } from './services/global-error-handler';

describe('initSession', () => {
  it('awaits authService.init() before resolving', async () => {
    const init = vi.fn().mockResolvedValue(undefined);
    const mockAuthService = { init } as unknown as AuthService;

    await initSession(mockAuthService)();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('propagates a rejection from authService.init()', async () => {
    const error = new Error('init failed');
    const mockAuthService = { init: vi.fn().mockRejectedValue(error) } as unknown as AuthService;

    await expect(initSession(mockAuthService)()).rejects.toThrow('init failed');
  });
});

describe('appConfig', () => {
  it('registers the custom route reuse strategy', () => {
    const provider = appConfig.providers.find(
      (p): p is { provide: unknown; useClass: unknown } =>
        typeof p === 'object' && p !== null && 'provide' in p && p.provide === RouteReuseStrategy,
    );
    expect(provider?.useClass).toBe(CustomRouteReuseStrategy);
  });

  it('registers the global error handler', () => {
    const provider = appConfig.providers.find(
      (p): p is { provide: unknown; useClass: unknown } =>
        typeof p === 'object' && p !== null && 'provide' in p && p.provide === ErrorHandler,
    );
    expect(provider?.useClass).toBe(GlobalErrorHandler);
  });

  it('has a non-empty provider list', () => {
    expect(Array.isArray(appConfig.providers)).toBe(true);
    expect(appConfig.providers.length).toBeGreaterThan(0);
  });
});
