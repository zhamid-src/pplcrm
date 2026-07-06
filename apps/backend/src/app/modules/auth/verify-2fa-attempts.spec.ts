import { vi, describe, it, expect, beforeEach } from 'vitest';

import { AuthController } from './controller';
import { AuthUsersRepo } from './repositories/authusers.repo';
import { BaseRepository } from '../../lib/base.repo';
import { hashToken } from '../../lib/token-hash';

/**
 * Per-account 2FA brute-force cap (SECURITY-REVIEW.md 2.5): a wrong OTP must
 * increment a counter, and once the cap is hit the code is invalidated so it
 * can't be ground down within its validity window.
 */
function mockUpdate(capture: { set?: Record<string, unknown> }) {
  const chain: Record<string, unknown> = {};
  chain['set'] = vi.fn((v: Record<string, unknown>) => {
    capture.set = v;
    return chain;
  });
  chain['where'] = vi.fn(() => chain);
  chain['execute'] = vi.fn().mockResolvedValue(undefined);
  return chain;
}

function setup(twoFactorAttempts: number) {
  const capture: { set?: Record<string, unknown> } = {};
  vi.spyOn(AuthUsersRepo.prototype, 'getByEmail').mockResolvedValue({
    id: '5',
    tenant_id: '1',
    email: 'u@example.com',
    verified: true,
    two_factor_code: hashToken('111111'), // the real (hashed) OTP
    two_factor_expires_at: new Date(Date.now() + 60_000),
    two_factor_attempts: twoFactorAttempts,
  } as never);

  vi.spyOn(BaseRepository.prototype, 'db', 'get').mockReturnValue({
    updateTable: vi.fn(() => mockUpdate(capture)),
  } as never);

  return { controller: new AuthController(), capture };
}

describe('verify2FA attempt cap', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('increments the attempt counter on a wrong code', async () => {
    const { controller, capture } = setup(0);
    await expect(controller.verify2FA('u@example.com', '000000')).rejects.toThrow('Invalid verification code.');
    expect(capture.set).toEqual({ two_factor_attempts: 1 });
  });

  it('invalidates the code once the cap is reached', async () => {
    const { controller, capture } = setup(4); // this wrong guess is the 5th
    await expect(controller.verify2FA('u@example.com', '000000')).rejects.toThrow(/Too many incorrect codes/);
    expect(capture.set).toMatchObject({ two_factor_code: null, two_factor_expires_at: null, two_factor_attempts: 0 });
  });
});
