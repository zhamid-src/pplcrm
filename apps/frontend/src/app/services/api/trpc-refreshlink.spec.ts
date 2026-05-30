import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { refreshLink } from './trpc-refreshlink';
import { type Operation } from '@trpc/client';
import { type Observer } from '@trpc/server/observable';

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
      getRefreshToken: vi.fn().mockReturnValue('refresh-token-123'),
      set: vi.fn().mockImplementation((payload) => {
        currentAuthToken = payload.auth_token;
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
                auth_token: validToken,
                refresh_token: 'new-refresh-token',
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

    // Check that mockTokenSvc.set was called to update token
    expect(mockTokenSvc.set).toHaveBeenCalledWith({
      auth_token: validToken,
      refresh_token: 'new-refresh-token',
    });

    // Subsequent call should not fetch because currentAuthToken is now updated (not expired)
    await executeLink();
    expect(fetchCount).toBe(1); // Still 1
  });
});
