import { vi, describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';

import { TooManyRequestsError } from '../../errors/app-errors';

// Control the shared rate limiter so we can assert the route's onRequest hook
// translates a limit breach into a 429 without pumping 120 real requests.
vi.mock('../../lib/rate-limiter', () => ({ checkRateLimit: vi.fn() }));
// Stop the tenant lookup from touching Postgres; an unknown key -> 401. (Zapier
// authenticates with the shared workspace API key — lib/validate-api-key.)
vi.mock('../../lib/validate-api-key', () => ({ lookupTenantByApiKey: vi.fn().mockResolvedValue(null) }));
vi.mock('../persons/services/persons.service', () => ({ PersonsService: class {} }));

import { checkRateLimit } from '../../lib/rate-limiter';
import zapierInboundRoute from './zapier-inbound.route';

async function buildApp() {
  const app = Fastify();
  await app.register(zapierInboundRoute, { prefix: '/api/zapier' });
  return app;
}

describe('zapier inbound rate limiting (SECURITY-REVIEW.md 2.4)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 429 when the rate limit is exceeded', async () => {
    (checkRateLimit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new TooManyRequestsError('Too many requests. Retry in 30 seconds.', { retryAfterSec: 30 });
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/zapier/persons/upsert',
      headers: { authorization: 'Bearer any-key' },
      payload: { email: 'a@b.com' },
    });
    await app.close();

    expect(res.statusCode).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(expect.stringContaining('zapier:'), 120, 60000);
  });

  it('lets a request through the hook when under the limit', async () => {
    (checkRateLimit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => undefined);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/zapier/persons/upsert',
      headers: { authorization: 'Bearer bad-key' },
      payload: { email: 'a@b.com' },
    });
    await app.close();

    // Hook passed; handler ran and rejected the unknown key.
    expect(res.statusCode).toBe(401);
  });
});
