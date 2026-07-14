import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bracketIndexForSubscribers } from '@common';
import { BaseRepository } from '../../lib/base.repo';
import { checkTenantUsage, countEmailableSubscribers, getPlanLimits, queueUsageLimitCheck } from './usage-limits';
import { syncSubscriptionQuantity } from './subscription-sync';

vi.mock('@common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@common')>();
  return { ...actual, bracketIndexForSubscribers: vi.fn(actual.bracketIndexForSubscribers) };
});

vi.mock('./subscription-sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./subscription-sync')>();
  return { ...actual, syncSubscriptionQuantity: vi.fn(actual.syncSubscriptionQuantity) };
});

async function createTestSeed(db: any) {
  const rand = () => String(Math.floor(Math.random() * 100000000) + 1000000);
  const tenantId = rand();
  const userId = rand();
  const householdId = rand();

  await db
    .insertInto('tenants')
    .values({
      id: tenantId,
      name: 'Test Tenant Billing Limits',
      subscription_plan: 'free',
      subscription_status: 'trialing',
    })
    .execute();

  await db
    .insertInto('authusers')
    .values({
      id: userId,
      tenant_id: tenantId,
      email: `admin-${userId}@example.com`,
      password: 'password',
      first_name: 'Test',
      last_name: 'Admin',
      role: 'admin',
      verified: true,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  // Persons requires a household_id (NOT NULL) — a single placeholder household backs every
  // emailable person this suite seeds, mirroring the `placeholder_household_id` pattern used
  // for tenants without campaign-scoped households.
  await db
    .insertInto('households')
    .values({
      id: householdId,
      tenant_id: tenantId,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  await db.updateTable('tenants').set({ admin_id: userId, createdby_id: userId }).where('id', '=', tenantId).execute();

  return { tenantId, userId, householdId };
}

/** Bulk-inserts `count` emailable persons for the tenant — a single multi-row INSERT so tests
 * that need to cross a subscriber bracket boundary stay fast. */
async function insertEmailablePersons(
  db: any,
  tenantId: string,
  userId: string,
  householdId: string,
  count: number,
): Promise<void> {
  const base = Number(tenantId) * 100_000;
  const rows = Array.from({ length: count }, (_, i) => ({
    id: String(base + i + 1),
    tenant_id: tenantId,
    household_id: householdId,
    email: `sub-${tenantId}-${i}@example.com`,
    createdby_id: userId,
    updatedby_id: userId,
  }));
  await db.insertInto('persons').values(rows).execute();
}

async function cleanTenant(db: any, tenantId: string) {
  await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('id', '=', tenantId).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('emails').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('files').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

function findEmailJob(jobs: { payload: unknown }[], match: (subject: string) => boolean) {
  return jobs.find((j) => {
    const p = typeof j.payload === 'string' ? JSON.parse(j.payload) : j.payload;
    return p.type === 'send-transactional-email' && typeof p.subject === 'string' && match(p.subject);
  });
}

describe('Usage Limits System', () => {
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let householdId: string;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    householdId = seed.householdId;
    vi.mocked(bracketIndexForSubscribers).mockClear();
    vi.mocked(syncSubscriptionQuantity).mockClear();
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  describe('getPlanLimits — bracket-aware', () => {
    it('resolves Grassroots limits at quantity 1 vs 2', () => {
      const g1 = getPlanLimits('grassroots', 1);
      expect(g1.subscribers).toBe(2_500);
      expect(g1.emails).toBe(30_000); // 12x
      expect(g1.price).toBe('$29/month');

      const g2 = getPlanLimits('grassroots', 2);
      expect(g2.subscribers).toBe(5_000);
      expect(g2.emails).toBe(60_000);
      expect(g2.price).toBe('$49/month');

      // Seats/storage are flat per tier, independent of quantity.
      expect(g2.seats).toBe(g1.seats);
      expect(g2.storageBytes).toBe(g1.storageBytes);
    });

    it('resolves the Movement piecewise step change across quantity 4 -> 5', () => {
      const m4 = getPlanLimits('movement', 4);
      expect(m4.subscribers).toBe(20_000);
      expect(m4.price).toBe('$195/month');

      const m5 = getPlanLimits('movement', 5);
      expect(m5.subscribers).toBe(25_000);
      expect(m5.price).toBe('$225/month');
      expect(m5.seats).toBe(Number.POSITIVE_INFINITY); // unlimited seats
    });

    it('applies the Free plan 2x email multiplier (vs 12x on paid tiers)', () => {
      const free = getPlanLimits('free');
      expect(free.subscribers).toBe(1_000);
      expect(free.emails).toBe(2_000);
    });

    it('resolves the retired "representative" legacy alias to movement', () => {
      expect(getPlanLimits('representative', 1)).toEqual(getPlanLimits('movement', 1));
    });

    it('reports unlimited/custom for enterprise (no pricing ladder)', () => {
      const ent = getPlanLimits('enterprise', 1);
      expect(ent.price).toBe('Custom');
      expect(ent.subscribers).toBe(Number.POSITIVE_INFINITY);
      expect(ent.emails).toBe(Number.POSITIVE_INFINITY);
    });
  });

  it('triggers a storage capacity alert when uploaded files exceed the plan quota', async () => {
    const quota = getPlanLimits('free').storageBytes;
    await db
      .insertInto('files')
      .values({
        tenant_id: tenantId,
        filename: 'huge.zip',
        size_bytes: quota,
        storage_key: `uploads/${tenantId}/huge.zip`,
      })
      .execute();

    await checkTenantUsage(tenantId, db);

    const jobs = await db.selectFrom('background_jobs').selectAll().where('tenant_id', '=', tenantId).execute();
    const storageAlert = findEmailJob(jobs, (s) => s.includes('storage') || true);
    expect(
      jobs.find((j: any) => {
        const p = typeof j.payload === 'string' ? JSON.parse(j.payload) : j.payload;
        return p.type === 'send-transactional-email' && p.text?.includes('file storage');
      }),
    ).toBeDefined();
    expect(storageAlert).toBeDefined();
  });

  it('should trigger alert at 90% and 100% capacity and reset flag on reduction', async () => {
    // Test via the user-seats resource: the Free plan seat limit is 2. The seed already holds
    // one seat (the admin), so add a second user to reach exactly 2 seats = 100% capacity.
    const secondUserId = String(Math.floor(Math.random() * 100000000) + 1000000);
    await db
      .insertInto('authusers')
      .values({
        id: secondUserId,
        tenant_id: tenantId,
        email: `member-${secondUserId}@example.com`,
        password: 'password',
        first_name: 'Second',
        last_name: 'Member',
        role: 'user',
        verified: true,
        createdby_id: secondUserId,
        updatedby_id: secondUserId,
      })
      .execute();

    await checkTenantUsage(tenantId, db);

    // With 2 seats, we are at 100% of the Free seats limit (limit: 2).
    // Let's verify that a background job to alert is enqueued
    const jobs = await db.selectFrom('background_jobs').selectAll().where('tenant_id', '=', tenantId).execute();

    // Since we are at 100% capacity, we should have enqueued a transactional email job
    expect(jobs.length).toBeGreaterThan(0);
    const emailJob = jobs.find((j: any) => {
      const p = typeof j.payload === 'string' ? JSON.parse(j.payload) : j.payload;
      return p.type === 'send-transactional-email' && p.subject.includes('[WARNING]');
    });
    expect(emailJob).toBeDefined();

    // Verify warning status is saved in settings
    const settingsRow = await db
      .selectFrom('settings')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('key', '=', 'billing.limit_alerts_sent')
      .executeTakeFirst();
    expect(settingsRow).toBeDefined();
    const settingsVal = typeof settingsRow.value === 'string' ? JSON.parse(settingsRow.value) : settingsRow.value;
    expect(settingsVal.seats_100).toBe(true);

    // 2. Now let's change plan to grassroots, which has a seats limit of 5.
    // Since 2 seats < 90% of 5 seats (90% of 5 is 4.5), it should reset the flags!
    await db.updateTable('tenants').set({ subscription_plan: 'grassroots' }).where('id', '=', tenantId).execute();

    // Run check again
    await checkTenantUsage(tenantId, db);

    // Verify flags are reset in settings
    const updatedSettingsRow = await db
      .selectFrom('settings')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('key', '=', 'billing.limit_alerts_sent')
      .executeTakeFirst();
    const updatedSettingsVal =
      typeof updatedSettingsRow.value === 'string' ? JSON.parse(updatedSettingsRow.value) : updatedSettingsRow.value;
    expect(updatedSettingsVal.seats_100).toBe(false);
    expect(updatedSettingsVal.seats_90).toBe(false);
  });

  it('should successfully enqueue check job', async () => {
    await queueUsageLimitCheck(tenantId, db);
    const jobs = await db.selectFrom('background_jobs').selectAll().where('tenant_id', '=', tenantId).execute();
    expect(jobs.length).toBe(1);
    const p = typeof jobs[0].payload === 'string' ? JSON.parse(jobs[0].payload) : jobs[0].payload;
    expect(p.type).toBe('check_usage_limits');
  });

  describe('countEmailableSubscribers', () => {
    it('counts persons with a usable, non-suppressed, non-DNC email', async () => {
      await insertEmailablePersons(db, tenantId, userId, householdId, 3);
      const count = await countEmailableSubscribers(tenantId, db);
      expect(count).toBe(3);
    });
  });

  describe('notify-then-adjust bracket sync (purchasable plans only)', () => {
    it('sends a bracket-up email once (dedup) and syncs the Stripe quantity when the list crosses into a higher bracket', async () => {
      await db
        .updateTable('tenants')
        .set({ subscription_plan: 'grassroots', subscription_quantity: 1 })
        .where('id', '=', tenantId)
        .execute();
      // Grassroots bracket 1 tops out at 2,500 — cross it.
      await insertEmailablePersons(db, tenantId, userId, householdId, 2_501);

      await checkTenantUsage(tenantId, db);

      expect(vi.mocked(syncSubscriptionQuantity)).toHaveBeenCalledWith(tenantId, 2);

      const jobsAfterFirst = await db
        .selectFrom('background_jobs')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .execute();
      const bracketUpEmail = findEmailJob(jobsAfterFirst, (s) => s.includes('new price bracket'));
      expect(bracketUpEmail).toBeDefined();

      // Real (non-mocked-implementation) syncSubscriptionQuantity ran in mock mode and wrote
      // subscription_quantity = 2, so a second check converges (billed === target) and must not
      // resend the email or call sync again.
      await checkTenantUsage(tenantId, db);
      expect(vi.mocked(syncSubscriptionQuantity)).toHaveBeenCalledTimes(1);

      const jobsAfterSecond = await db
        .selectFrom('background_jobs')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .execute();
      const bracketUpEmailsCount = jobsAfterSecond.filter((j: any) => {
        const p = typeof j.payload === 'string' ? JSON.parse(j.payload) : j.payload;
        return p.type === 'send-transactional-email' && p.subject?.includes('new price bracket');
      }).length;
      expect(bracketUpEmailsCount).toBe(1);
    });

    it('sends an "outgrown this tier" alert and clamps the sync quantity when the list exceeds the tier max', async () => {
      await db
        .updateTable('tenants')
        .set({ subscription_plan: 'grassroots', subscription_quantity: 5 })
        .where('id', '=', tenantId)
        .execute();
      // Simulate "over the tier max" without seeding 50,000+ rows — the count itself is not
      // under test here, `bracketIndexForSubscribers` boundary values are covered in
      // libs/common/src/lib/billing/plans.spec.ts.
      vi.mocked(bracketIndexForSubscribers).mockImplementationOnce(() => null);

      await checkTenantUsage(tenantId, db);

      expect(vi.mocked(syncSubscriptionQuantity)).toHaveBeenCalledWith(tenantId, 11); // maxQuantity('grassroots')
      const jobs = await db.selectFrom('background_jobs').selectAll().where('tenant_id', '=', tenantId).execute();
      const maxEmail = findEmailJob(jobs, (s) => s.includes('outgrown'));
      expect(maxEmail).toBeDefined();

      // Second run — dedup flag suppresses a repeat email; the real sync already clamped
      // subscription_quantity to 11 in mock mode, so a re-clamp doesn't fire again either.
      vi.mocked(bracketIndexForSubscribers).mockImplementationOnce(() => null);
      await checkTenantUsage(tenantId, db);
      expect(vi.mocked(syncSubscriptionQuantity)).toHaveBeenCalledTimes(1);
      const jobsAfterSecond = await db
        .selectFrom('background_jobs')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .execute();
      const maxEmailsCount = jobsAfterSecond.filter((j: any) => {
        const p = typeof j.payload === 'string' ? JSON.parse(j.payload) : j.payload;
        return p.type === 'send-transactional-email' && p.subject?.includes('outgrown');
      }).length;
      expect(maxEmailsCount).toBe(1);
    });

    it('does not sync mid-cycle when the emailable count drops below the billed bracket', async () => {
      await db
        .updateTable('tenants')
        .set({ subscription_plan: 'grassroots', subscription_quantity: 3 })
        .where('id', '=', tenantId)
        .execute();
      vi.mocked(bracketIndexForSubscribers).mockImplementationOnce(() => 1); // below billed quantity 3

      await checkTenantUsage(tenantId, db);

      expect(vi.mocked(syncSubscriptionQuantity)).not.toHaveBeenCalled();
    });

    it('free tenants over their subscriber cap get the existing soft 90/100% alerts only — no Stripe sync', async () => {
      await insertEmailablePersons(db, tenantId, userId, householdId, 1_001); // Free's cap is 1,000

      await checkTenantUsage(tenantId, db);

      const jobs = await db.selectFrom('background_jobs').selectAll().where('tenant_id', '=', tenantId).execute();
      const subscriberAlert = jobs.find((j: any) => {
        const p = typeof j.payload === 'string' ? JSON.parse(j.payload) : j.payload;
        return p.type === 'send-transactional-email' && p.text?.includes('email subscribers');
      });
      expect(subscriberAlert).toBeDefined();
      expect(vi.mocked(syncSubscriptionQuantity)).not.toHaveBeenCalled();
    });
  });
});
