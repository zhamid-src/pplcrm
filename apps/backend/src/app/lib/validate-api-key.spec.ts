import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import type { FastifyRequest } from 'fastify';

/**
 * The workspace API key must be stored and looked up by SHA-256 hash, never plaintext
 * (SECURITY-REVIEW.md 2.4) — this is the single key mechanism behind the public
 * submission endpoints, the Zapier inbound routes, and the API Keys settings page.
 */
const mocks = vi.hoisted(() => ({
  getByKeyHash: vi.fn(),
  updateLastUsed: vi.fn(),
}));

vi.mock('../modules/settings/repositories/workspace-api-keys.repo', () => ({
  WorkspaceApiKeysRepo: class {
    getByKeyHash = mocks.getByKeyHash;
    updateLastUsed = mocks.updateLastUsed;
  },
}));

import { generateApiKey, hashApiKey } from './api-key';
import { lookupTenantByApiKey, tenantIdFromOptionalApiKey } from './validate-api-key';

function reqWithAuth(authorization?: string): FastifyRequest {
  return { headers: authorization ? { authorization } : {} } as FastifyRequest;
}

describe('workspace API key lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateLastUsed.mockResolvedValue(undefined);
  });

  it('generates ws_-prefixed high-entropy keys', () => {
    const key = generateApiKey();
    expect(key).toMatch(/^ws_/);
    expect(key.length).toBeGreaterThan(40);
    expect(generateApiKey()).not.toBe(key);
  });

  it('looks up by hash (never plaintext) and stamps last_used_at on a hit', async () => {
    const key = generateApiKey();
    mocks.getByKeyHash.mockResolvedValue({ tenant_id: '42' });

    const tenant = await lookupTenantByApiKey(key);

    expect(tenant).toBe('42');
    expect(mocks.getByKeyHash).toHaveBeenCalledWith(hashApiKey(key));
    expect(mocks.getByKeyHash).not.toHaveBeenCalledWith(key);
    expect(mocks.updateLastUsed).toHaveBeenCalledWith('42');
  });

  it('returns null for an unknown key without touching last_used_at', async () => {
    mocks.getByKeyHash.mockResolvedValue(undefined);

    expect(await lookupTenantByApiKey('ws_unknown')).toBeNull();
    expect(mocks.updateLastUsed).not.toHaveBeenCalled();
  });

  describe('tenantIdFromOptionalApiKey', () => {
    it('returns null when no Authorization header is present (anonymous browser path)', async () => {
      expect(await tenantIdFromOptionalApiKey(reqWithAuth())).toBeNull();
      expect(mocks.getByKeyHash).not.toHaveBeenCalled();
    });

    it('resolves the tenant for a valid Bearer key', async () => {
      mocks.getByKeyHash.mockResolvedValue({ tenant_id: '7' });
      expect(await tenantIdFromOptionalApiKey(reqWithAuth('Bearer ws_good'))).toBe('7');
    });

    it('throws UNAUTHORIZED for an unknown key — a misconfigured integration must fail loudly', async () => {
      mocks.getByKeyHash.mockResolvedValue(undefined);
      await expect(tenantIdFromOptionalApiKey(reqWithAuth('Bearer ws_bad'))).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('throws UNAUTHORIZED for a malformed Authorization header', async () => {
      await expect(tenantIdFromOptionalApiKey(reqWithAuth('Bearer   '))).rejects.toBeInstanceOf(TRPCError);
      expect(mocks.getByKeyHash).not.toHaveBeenCalled();
    });
  });
});
