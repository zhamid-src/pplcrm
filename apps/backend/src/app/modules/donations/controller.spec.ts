import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BaseRepository } from '../../lib/base.repo';
import { hashToken } from '../../lib/token-hash';
import { DonationsController } from './controller';

async function cleanTenant(db: any, tenantId: string, _personId: string) {
  await db
    .updateTable('tenants')
    .set({ admin_id: null, createdby_id: null, placeholder_household_id: null })
    .where('id', '=', tenantId)
    .execute();
  await db.deleteFrom('donations').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

async function createTestSeed(db: any) {
  const rand = () => String(Math.floor(Math.random() * 100000000) + 1000000);
  const tenantId = rand();
  const userId = rand();
  const campaignId = rand();
  const householdId = rand();
  const personId = rand();

  await db
    .insertInto('tenants')
    .values({
      id: tenantId,
      name: 'Test Tenant Donations',
    })
    .execute();

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

  await db
    .insertInto('campaigns')
    .values({
      id: campaignId,
      tenant_id: tenantId,
      admin_id: userId,
      name: 'Test Campaign',
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  await db
    .insertInto('households')
    .values({
      id: householdId,
      tenant_id: tenantId,
      campaign_id: campaignId,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  await db
    .updateTable('tenants')
    .set({ admin_id: userId, createdby_id: userId, placeholder_household_id: householdId })
    .where('id', '=', tenantId)
    .execute();

  // Create a person
  await db
    .insertInto('persons' as any)
    .values({
      id: personId,
      tenant_id: tenantId,
      campaign_id: campaignId,
      household_id: householdId,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      createdby_id: userId,
      updatedby_id: userId,
    } as any)
    .execute();

  return { tenantId, userId, campaignId, householdId, personId };
}

describe('DonationsController Unit & Integration', () => {
  const controller = new DonationsController();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let personId: string;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    personId = seed.personId;
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId, personId);
  });

  describe('Tax Credit Calculation', () => {
    it('should return 0 when no tiers are provided', () => {
      const credit = controller.calculateTaxCredit(10000, 0, []);
      expect(credit).toBe(0);
    });

    it('should calculate correct credit with progressive tiers', () => {
      const tiers = [
        { limit: 500, rate: 0.75 },
        { limit: 1000, rate: 0.5 },
        { limit: 2000, rate: 0.4 },
      ];

      // Test 1: $500 donation under $500 tier
      const credit1 = controller.calculateTaxCredit(50000, 0, tiers);
      expect(credit1).toBe(37500); // 500 * 0.75 = 375

      // Test 2: $100 donation when cumulative is already $500
      const credit2 = controller.calculateTaxCredit(10000, 50000, tiers);
      expect(credit2).toBe(5000); // 100 * 0.50 = 50

      // Test 3: $1000 donation starting at $250 cumulative
      // - Next $250 goes to Tier 1 ($250-$500) -> 250 * 0.75 = 187.5
      // - Next $500 goes to Tier 2 ($500-$1000) -> 500 * 0.50 = 250.0
      // - Remaining $250 goes to Tier 3 ($1000-$2000) -> 250 * 0.40 = 100.0
      // - Total: 187.5 + 250 + 100 = 537.5 -> rounded to 538
      const credit3 = controller.calculateTaxCredit(100000, 25000, tiers);
      expect(credit3).toBe(53750); // in cents, so 537.5 * 100 = 53750
    });
  });

  describe('Eligibility Check', () => {
    it('should block donation if it exceeds the annual limit', async () => {
      // Set limit in settings
      await db
        .insertInto('settings')
        .values({
          tenant_id: tenantId,
          key: 'donations.limit',
          value: JSON.stringify(1500) as any, // $1500 limit
          createdby_id: userId,
          updatedby_id: userId,
        })
        .execute();

      // Record a prior successful donation of $1000
      await db
        .insertInto('donations')
        .values({
          tenant_id: tenantId,
          person_id: personId,
          amount: 100000,
          status: 'succeeded',
        })
        .execute();

      // Attempt $600 donation -> cumulative would be 1600 > 1500 limit
      const check = await controller.checkEligibility(tenantId, personId, 60000, {});
      expect(check.eligible).toBe(false);
      expect(check.reason).toContain('exceeds the maximum limit of');
    });

    it('should block donation if residency restrictions are violated', async () => {
      // Restrict residency to CA and province ON
      await db
        .insertInto('settings')
        .values([
          {
            tenant_id: tenantId,
            key: 'donations.restrict_residency',
            value: JSON.stringify(true) as any,
            createdby_id: userId,
            updatedby_id: userId,
          },
          {
            tenant_id: tenantId,
            key: 'donations.allowed_countries',
            value: JSON.stringify('CA') as any,
            createdby_id: userId,
            updatedby_id: userId,
          },
          {
            tenant_id: tenantId,
            key: 'donations.allowed_regions',
            value: JSON.stringify('ON') as any,
            createdby_id: userId,
            updatedby_id: userId,
          },
        ])
        .execute();

      // Non-matching state: QC
      const check1 = await controller.checkEligibility(tenantId, personId, 10000, { country: 'CA', state: 'QC' });
      expect(check1.eligible).toBe(false);
      expect(check1.reason).toContain('allowed provinces/states: ON');

      // Matching state: ON
      const check2 = await controller.checkEligibility(tenantId, personId, 10000, { country: 'CA', state: 'ON' });
      expect(check2.eligible).toBe(true);
    });
  });

  // The webhook token must be stored hashed and shown only once (SECURITY-REVIEW.md 2.4).
  describe('Webhook token', () => {
    it('persists only the hash and reports configured status', async () => {
      expect(await controller.getWebhookTokenStatus(tenantId)).toEqual({ configured: false });

      const { token } = await controller.regenerateWebhookToken(tenantId, userId);
      expect(token).toMatch(/^wt_/);

      const row = await db
        .selectFrom('settings')
        .select('value')
        .where('tenant_id', '=', tenantId)
        .where('key', '=', 'donations.webhook_token')
        .executeTakeFirst();

      // Stored at rest as the hash, never the plaintext token (jsonb, so it comes back parsed).
      expect(row?.value).toBe(hashToken(token));
      expect(String(row?.value)).not.toContain(token);

      // The webhook route resolves the tenant by looking up value = JSON.stringify(hashToken(token)).
      // Replicate that exact query to prove hashing-at-rest stays compatible with resolution.
      const matched = await db
        .selectFrom('settings')
        .select('tenant_id')
        .where('key', '=', 'donations.webhook_token')
        .where('value', '=', JSON.stringify(hashToken(token)))
        .executeTakeFirst();
      expect(String(matched?.tenant_id)).toBe(tenantId);

      expect(await controller.getWebhookTokenStatus(tenantId)).toEqual({ configured: true });
    });
  });
});
