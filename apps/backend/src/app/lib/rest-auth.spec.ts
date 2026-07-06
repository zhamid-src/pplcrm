import { vi, describe, it, expect, beforeEach } from 'vitest';

import type { FastifyRequest } from 'fastify';

import { authenticateRest } from './rest-auth';
import { BaseRepository } from './base.repo';
import * as authUtil from './auth-util';

/**
 * Covers the shared REST auth helper (SECURITY-REVIEW.md 1.2): session revocation
 * and the viewer-role write guard, previously enforced only by the tRPC middleware.
 */
function mockDb(opts: { user: unknown; session: unknown }): void {
  const makeQB = (result: unknown): unknown => ({
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue(result),
  });
  vi.spyOn(BaseRepository, 'dbInstance', 'get').mockReturnValue({
    selectFrom: vi.fn((table: string) => (table === 'sessions' ? makeQB(opts.session) : makeQB(opts.user))),
  } as never);
}

function req(overrides: Partial<{ authorization: string; query: Record<string, unknown> }> = {}): FastifyRequest {
  return {
    headers: overrides.authorization ? { authorization: overrides.authorization } : {},
    query: overrides.query ?? {},
  } as unknown as FastifyRequest;
}

const ACTIVE_SESSION = { id: 's1', expires_at: null };

describe('authenticateRest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtil, 'verifyAuthToken').mockResolvedValue({
      tenant_id: '1',
      user_id: '2',
      session_id: 'plain-session',
      name: 'Tester',
    } as never);
  });

  it('rejects a request with no token (401)', async () => {
    mockDb({ user: { role: 'owner', verified: true }, session: ACTIVE_SESSION });
    const result = await authenticateRest(req());
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects an invalid/expired token (401)', async () => {
    vi.spyOn(authUtil, 'verifyAuthToken').mockRejectedValue(new Error('bad token'));
    mockDb({ user: { role: 'owner', verified: true }, session: ACTIVE_SESSION });
    const result = await authenticateRest(req({ authorization: 'Bearer x' }));
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it('allows a valid token with an active session', async () => {
    mockDb({ user: { role: 'owner', verified: true }, session: ACTIVE_SESSION });
    const result = await authenticateRest(req({ authorization: 'Bearer x' }), { requireWrite: true });
    expect(result).toEqual({ ok: true, auth: { tenant_id: '1', user_id: '2', role: 'owner', verified: true } });
  });

  it('blocks a viewer on a write endpoint (403)', async () => {
    mockDb({ user: { role: 'viewer', verified: true }, session: ACTIVE_SESSION });
    const result = await authenticateRest(req({ authorization: 'Bearer x' }), { requireWrite: true });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('allows a viewer on a read endpoint', async () => {
    mockDb({ user: { role: 'viewer', verified: true }, session: ACTIVE_SESSION });
    const result = await authenticateRest(req({ authorization: 'Bearer x' }));
    expect(result).toMatchObject({ ok: true, auth: { role: 'viewer' } });
  });

  it('rejects when the session was revoked (401)', async () => {
    mockDb({ user: { role: 'owner', verified: true }, session: undefined });
    const result = await authenticateRest(req({ authorization: 'Bearer x' }), { requireWrite: true });
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the session has expired (401)', async () => {
    mockDb({ user: { role: 'owner', verified: true }, session: { id: 's1', expires_at: new Date(Date.now() - 1000) } });
    const result = await authenticateRest(req({ authorization: 'Bearer x' }));
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it('reads the token from the query string only when allowed', async () => {
    mockDb({ user: { role: 'owner', verified: true }, session: ACTIVE_SESSION });

    const denied = await authenticateRest(req({ query: { token: 'x' } }));
    expect(denied).toMatchObject({ ok: false, status: 401 });

    const allowed = await authenticateRest(req({ query: { token: 'x' } }), { allowQueryToken: true });
    expect(allowed).toMatchObject({ ok: true });
  });
});
