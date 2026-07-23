import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Force live (non-mock) mode BEFORE the platform client module is imported.
vi.mock('../../../env', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    env: {
      ...actual.env,
      stripeSecretKey: 'sk_test_live_key_not_mock',
    },
  };
});

const stripeMocks = vi.hoisted(() => ({
  accountsCreate: vi.fn(),
  accountsRetrieve: vi.fn(),
  createLoginLink: vi.fn(),
  accountLinksCreate: vi.fn(),
}));
vi.mock('stripe', () => ({
  default: class MockStripe {
    accounts = {
      create: stripeMocks.accountsCreate,
      retrieve: stripeMocks.accountsRetrieve,
      createLoginLink: stripeMocks.createLoginLink,
    };
    accountLinks = {
      create: stripeMocks.accountLinksCreate,
    };
  },
}));

import { env } from '../../../env';
import { BaseRepository } from '../../lib/base.repo';
import {
  assertStripeConnectReady,
  createDashboardLoginLink,
  disconnect,
  getCachedConnectState,
  getConnectStatus,
  startOnboarding,
  STRIPE_ACCOUNT_ID_KEY,
  STRIPE_ACCOUNT_STATUS_KEY,
} from './stripe-connect';
import { PreconditionFailedError } from '../../errors/app-errors';

const db = (BaseRepository as any)._db;

async function seedTenant(): Promise<{ tenantId: string; userId: string }> {
  const rand = () => String(Math.floor(Math.random() * 100000000) + 1000000);
  const tenantId = rand();
  const userId = rand();
  await db.insertInto('tenants').values({ id: tenantId, name: 'Test Tenant Stripe Connect' }).execute();
  await db
    .insertInto('authusers')
    .values({
      id: userId,
      tenant_id: tenantId,
      email: `test-${userId}@example.com`,
      password: 'password',
      first_name: 'Test',
      last_name: 'User',
      verified: true,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();
  return { tenantId, userId };
}

async function cleanTenant(tenantId: string): Promise<void> {
  await db.deleteFrom('settings').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

async function readSetting(tenantId: string, key: string): Promise<unknown> {
  const row = await db
    .selectFrom('settings')
    .select('value')
    .where('tenant_id', '=', tenantId)
    .where('key', '=', key)
    .executeTakeFirst();
  return row?.value;
}

describe('stripe-connect (Connect account management)', () => {
  let tenantId: string;
  let userId: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    stripeMocks.accountsCreate.mockReset();
    stripeMocks.accountsRetrieve.mockReset();
    stripeMocks.createLoginLink.mockReset();
    stripeMocks.accountLinksCreate.mockReset();
    ({ tenantId, userId } = await seedTenant());
  });

  afterEach(async () => {
    await cleanTenant(tenantId);
  });

  it('blocks Stripe Connect changes while the tenant is in demo mode', async () => {
    await db.updateTable('tenants').set({ demo_mode_at: new Date() }).where('id', '=', tenantId).execute();

    await expect(startOnboarding(tenantId, userId, 'US')).rejects.toThrow(/demo/i);
    await expect(createDashboardLoginLink(tenantId)).rejects.toThrow(/demo/i);
    await expect(disconnect(tenantId)).rejects.toThrow(/demo/i);
    expect(stripeMocks.accountsCreate).not.toHaveBeenCalled();
  });

  it('startOnboarding creates the account with the decided controller shape, persists the id, and returns the link', async () => {
    stripeMocks.accountsCreate.mockResolvedValue({ id: 'acct_new_1' });
    stripeMocks.accountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.example/onboard' });

    const { url } = await startOnboarding(tenantId, userId, 'US');

    expect(url).toBe('https://connect.stripe.example/onboard');
    expect(stripeMocks.accountsCreate).toHaveBeenCalledWith({
      country: 'US',
      controller: {
        fees: { payer: 'account' },
        losses: { payments: 'stripe' },
        requirement_collection: 'stripe',
        stripe_dashboard: { type: 'express' },
      },
      capabilities: { card_payments: { requested: true } },
      metadata: { tenantId },
    });
    expect(stripeMocks.accountLinksCreate).toHaveBeenCalledWith({
      account: 'acct_new_1',
      type: 'account_onboarding',
      refresh_url: `${env.appUrl}/workspace/donations?stripe_refresh=true`,
      return_url: `${env.appUrl}/workspace/donations?stripe_connected=true`,
    });
    expect(await readSetting(tenantId, STRIPE_ACCOUNT_ID_KEY)).toBe('acct_new_1');

    // Second call (resume): no new account — just a fresh link for the existing one.
    stripeMocks.accountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.example/resume' });
    const second = await startOnboarding(tenantId, userId, 'US');
    expect(second.url).toBe('https://connect.stripe.example/resume');
    expect(stripeMocks.accountsCreate).toHaveBeenCalledTimes(1);
  });

  it('getConnectStatus retrieves live status and refreshes the cache; falls back to the cache on failure', async () => {
    stripeMocks.accountsCreate.mockResolvedValue({ id: 'acct_stat_1' });
    stripeMocks.accountLinksCreate.mockResolvedValue({ url: 'https://x' });
    await startOnboarding(tenantId, userId, 'CA');

    stripeMocks.accountsRetrieve.mockResolvedValue({
      id: 'acct_stat_1',
      details_submitted: true,
      charges_enabled: true,
      requirements: { currently_due: ['individual.dob'] },
    });
    const live = await getConnectStatus(tenantId, userId);
    expect(live).toMatchObject({
      connected: true,
      accountId: 'acct_stat_1',
      detailsSubmitted: true,
      chargesEnabled: true,
      requirementsDue: ['individual.dob'],
      isMockMode: false,
    });
    expect(await readSetting(tenantId, STRIPE_ACCOUNT_STATUS_KEY)).toEqual({
      detailsSubmitted: true,
      chargesEnabled: true,
    });

    // Stripe unreachable → the cached status (just refreshed above) is served instead of an error.
    stripeMocks.accountsRetrieve.mockRejectedValue(new Error('stripe down'));
    const cached = await getConnectStatus(tenantId, userId);
    expect(cached).toMatchObject({ connected: true, chargesEnabled: true, detailsSubmitted: true });
  });

  it('reports not-connected before onboarding', async () => {
    const status = await getConnectStatus(tenantId, userId);
    expect(status).toMatchObject({ connected: false, accountId: null, chargesEnabled: false });
  });

  it('assertStripeConnectReady fails closed until charges are enabled, then returns the account id', async () => {
    await expect(assertStripeConnectReady(tenantId)).rejects.toBeInstanceOf(PreconditionFailedError);

    stripeMocks.accountsCreate.mockResolvedValue({ id: 'acct_gate_1' });
    stripeMocks.accountLinksCreate.mockResolvedValue({ url: 'https://x' });
    await startOnboarding(tenantId, userId, 'US');

    // Onboarding started but charges not enabled yet → still gated.
    await expect(assertStripeConnectReady(tenantId)).rejects.toBeInstanceOf(PreconditionFailedError);

    // account.updated (via the worker) flips the cached status → gate opens.
    stripeMocks.accountsRetrieve.mockResolvedValue({
      id: 'acct_gate_1',
      details_submitted: true,
      charges_enabled: true,
    });
    await getConnectStatus(tenantId, userId);
    expect(await assertStripeConnectReady(tenantId)).toBe('acct_gate_1');
    expect(await getCachedConnectState(tenantId)).toEqual({ accountId: 'acct_gate_1', chargesEnabled: true });
  });

  it('createDashboardLoginLink requires a connection; disconnect clears the settings keys', async () => {
    await expect(createDashboardLoginLink(tenantId)).rejects.toBeInstanceOf(PreconditionFailedError);

    stripeMocks.accountsCreate.mockResolvedValue({ id: 'acct_login_1' });
    stripeMocks.accountLinksCreate.mockResolvedValue({ url: 'https://x' });
    await startOnboarding(tenantId, userId, 'US');

    stripeMocks.createLoginLink.mockResolvedValue({ url: 'https://connect.stripe.example/express-login' });
    expect(await createDashboardLoginLink(tenantId)).toEqual({ url: 'https://connect.stripe.example/express-login' });
    expect(stripeMocks.createLoginLink).toHaveBeenCalledWith('acct_login_1');

    await disconnect(tenantId);
    expect(await readSetting(tenantId, STRIPE_ACCOUNT_ID_KEY)).toBeUndefined();
    expect(await readSetting(tenantId, STRIPE_ACCOUNT_STATUS_KEY)).toBeUndefined();
  });
});
