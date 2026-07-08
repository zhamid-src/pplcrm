import { vi, describe, it, expect, beforeEach } from 'vitest';

import { ZapierService } from './zapier.service';
import { BaseRepository } from '../../lib/base.repo';
import { hashToken } from '../../lib/token-hash';

/**
 * The Zapier API key must be stored hashed and looked up by hash, never plaintext
 * (SECURITY-REVIEW.md 2.4).
 */
function captureDb() {
  const captured: { insertValue?: unknown; lookupValue?: unknown } = {};

  const insertChain: Record<string, unknown> = {};
  insertChain['values'] = vi.fn((v: { value: unknown }) => {
    captured.insertValue = v.value;
    return insertChain;
  });
  insertChain['onConflict'] = vi.fn(() => insertChain);
  insertChain['execute'] = vi.fn().mockResolvedValue(undefined);

  const selectChain: Record<string, unknown> = {};
  selectChain['select'] = vi.fn(() => selectChain);
  selectChain['where'] = vi.fn((col: string, _op: string, val: unknown) => {
    if (col === 'value') captured.lookupValue = val;
    return selectChain;
  });
  selectChain['executeTakeFirst'] = vi.fn().mockResolvedValue({ tenant_id: '1' });

  vi.spyOn(BaseRepository, 'dbInstance', 'get').mockReturnValue({
    insertInto: vi.fn(() => insertChain),
    selectFrom: vi.fn(() => selectChain),
  } as never);

  return captured;
}

describe('ZapierService API key hashing', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('persists the hash (not the plaintext) and looks up by hash', async () => {
    const captured = captureDb();
    const svc = new ZapierService();

    const key = await svc.regenerateApiKey('1');
    expect(key).toMatch(/^zap_/);
    // Stored value is the hash of the key, never the key itself.
    expect(captured.insertValue).toBe(JSON.stringify(hashToken(key)));
    expect(captured.insertValue).not.toContain(key);

    const tenant = await svc.lookupTenantByApiKey(key);
    expect(tenant).toBe('1');
    expect(captured.lookupValue).toBe(JSON.stringify(hashToken(key)));
  });
});
