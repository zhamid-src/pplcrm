import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { refreshLink } from './trpc-refreshlink';
import { TRPCClientError } from '@trpc/client';
import type { Operation } from '@trpc/client';
import type { Observer } from '@trpc/server/observable';

const expiredToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 })) + '.signature';
const validToken = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })) + '.signature';

describe('trpc-refreshlink', () => {
  let mockTokenSvc: any;
  let mockRouter: any;
  let currentAuthToken: string;
  let fetchCount: number;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    currentAuthToken = expiredToken;
    fetchCount = 0;

    mockTokenSvc = {
      getAuthToken: vi.fn().mockImplementation(() => currentAuthToken),
      setAuthToken: vi.fn().mockImplementation((token) => {
        currentAuthToken = token;
      }),
      clearAll: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
      url: '/current-url',
    };

    globalThis.fetch = vi.fn().mockImplementation(async (_url, _init) => {
      fetchCount++;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          result: {
            data: {
              json: {
                // Renew now returns only the access token; the refresh token is an HttpOnly cookie.
                auth_token: validToken,
              },
            },
          },
        }),
      };
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('should coalesce parallel token refreshes into a single fetch request', async () => {
    const link = refreshLink(mockTokenSvc, mockRouter)({} as any);

    const executeLink = () => {
      return new Promise((resolve, reject) => {
        const mockOp: Operation = {
          id: 1,
          type: 'query',
          path: 'testPath',
          input: {},
          context: {},
          signal: new AbortController().signal,
        };
        const mockNext = vi.fn().mockReturnValue({
          subscribe: (observer: Observer<any, any>) => {
            observer.next('result');
            observer.complete();
            return { unsubscribe: vi.fn() };
          },
        });

        link({ op: mockOp, next: mockNext }).subscribe({
          next: resolve,
          error: reject,
        });
      });
    };

    // Execute three requests in parallel
    await Promise.all([executeLink(), executeLink(), executeLink()]);

    // Check that we only fetched once
    expect(fetchCount).toBe(1);

    // Check that the refreshed access token was stored in memory
    expect(mockTokenSvc.setAuthToken).toHaveBeenCalledWith(validToken);

    // Subsequent call should not fetch because currentAuthToken is now updated (not expired)
    await executeLink();
    expect(fetchCount).toBe(1); // Still 1
  });

  it('should refresh and retry once when the server rejects a seemingly-valid token', async () => {
    // The token looks fine client-side, but its session was rotated away by another tab.
    currentAuthToken = validToken;
    const link = refreshLink(mockTokenSvc, mockRouter)({} as any);

    let attempts = 0;
    const mockNext = vi.fn().mockImplementation(() => ({
      subscribe: (observer: Observer<any, any>) => {
        attempts++;
        if (attempts === 1) {
          observer.error(unauthorizedClientError());
        } else {
          observer.next('result');
          observer.complete();
        }
        return { unsubscribe: vi.fn() };
      },
    }));

    const result = await new Promise((resolve, reject) => {
      link({ op: makeOp('persons.getAll'), next: mockNext }).subscribe({ next: resolve, error: reject });
    });

    expect(result).toBe('result');
    expect(attempts).toBe(2); // original call + one retry
    expect(fetchCount).toBe(1); // exactly one refresh round-trip
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should clear tokens and redirect to /signin when the retry refresh fails', async () => {
    currentAuthToken = validToken;
    // The refresh cookie's session is gone too (real sign-out / revocation) — renew returns 401.
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: false,
      status: 401,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({
        error: { json: { message: 'UNAUTHORIZED', code: -32001, data: { code: 'UNAUTHORIZED', httpStatus: 401 } } },
      }),
    })) as any;
    const link = refreshLink(mockTokenSvc, mockRouter)({} as any);

    const mockNext = vi.fn().mockReturnValue({
      subscribe: (observer: Observer<any, any>) => {
        observer.error(unauthorizedClientError());
        return { unsubscribe: vi.fn() };
      },
    });

    await expect(
      new Promise((resolve, reject) => {
        link({ op: makeOp('persons.getAll'), next: mockNext }).subscribe({ next: resolve, error: reject });
      }),
    ).rejects.toBeInstanceOf(TRPCClientError);

    expect(mockNext).toHaveBeenCalledTimes(1); // no retry when the refresh fails
    expect(mockTokenSvc.clearAll).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/signin'], { queryParams: { returnUrl: '/current-url' } });
  });
});

function makeOp(path: string): Operation {
  return { id: 1, type: 'query', path, input: {}, context: {}, signal: new AbortController().signal };
}

function unauthorizedClientError(): TRPCClientError<any> {
  return TRPCClientError.from({
    error: { message: 'UNAUTHORIZED', code: -32001, data: { code: 'UNAUTHORIZED', httpStatus: 401 } },
  } as any);
}
