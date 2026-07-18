import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth-service';
import { roleGuard } from './role-guard';

describe('roleGuard', () => {
  let mockAuth: { getUser: ReturnType<typeof vi.fn>; getCurrentUser: ReturnType<typeof vi.fn> };

  const run = () => TestBed.runInInjectionContext(() => roleGuard({} as any, {} as any));

  beforeEach(() => {
    mockAuth = {
      getUser: vi.fn().mockReturnValue(null),
      getCurrentUser: vi.fn().mockResolvedValue(null),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: mockAuth }],
    });
  });

  it('admits a cached elevated user without a network round-trip', async () => {
    mockAuth.getUser.mockReturnValue({ role: 'admin' });

    await expect(run()).resolves.toBe(true);
    expect(mockAuth.getCurrentUser).not.toHaveBeenCalled();
  });

  it('falls back to fetching the current user when the cache is empty', async () => {
    mockAuth.getCurrentUser.mockResolvedValue({ role: 'admin' });

    await expect(run()).resolves.toBe(true);
    expect(mockAuth.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('redirects a signed-out visitor to /signin', async () => {
    const result = await run();

    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/signin');
  });

  it('redirects a plain user role to the dashboard', async () => {
    mockAuth.getUser.mockReturnValue({ role: 'user' });

    const result = await run();

    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/dashboard');
  });
});
