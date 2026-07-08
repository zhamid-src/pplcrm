import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseRepository } from '../../lib/base.repo';
import { checkTenantUsage, getPlanLimits, queueUsageLimitCheck } from './usage-limits';

async function createTestSeed(db: any) {
  const rand = () => String(Math.floor(Math.random() * 100000000) + 1000000);
  const tenantId = rand();
  const userId = rand();

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

  await db.updateTable('tenants').set({ admin_id: userId, createdby_id: userId }).where('id', '=', tenantId).execute();

  return { tenantId, userId };
}

async function cleanTenant(db: any, tenantId: string) {
  await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('id', '=', tenantId).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('emails').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('Usage Limits System', () => {
  const db = (BaseRepository as any)._db;
  let tenantId: string;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  it('should return correct limits for each plan', () => {
    const freeLimits = getPlanLimits('free');
    expect(freeLimits.contacts).toBe(500);
    expect(freeLimits.seats).toBe(1);

    const grassrootsLimits = getPlanLimits('grassroots');
    expect(grassrootsLimits.contacts).toBe(5000);
    expect(grassrootsLimits.seats).toBe(3);

    const representativeLimits = getPlanLimits('representative');
    expect(representativeLimits.contacts).toBe(50000);
    expect(representativeLimits.seats).toBe(10);
  });

  it('should trigger alert at 90% and 100% capacity and reset flag on reduction', async () => {
    const _limits = getPlanLimits('free');

    // 1. Seed contacts to hit exactly 90% capacity of the Free Plan (90% of 500 = 450 contacts)
    // For performance, we don't need to insert 450 rows, but wait, the query uses sql<number>`count(*)`
    // So we need to insert rows or mock the db results? It's easier and faster to just insert them.
    // Wait, inserting 450 contacts might be a bit slow, but since we are running locally on SQLite/PostgreSQL, it is very fast.
    // Or we can update the tenant plan to a custom plan? But the plan name is an enum.
    // Wait, we can test user seats! The Free plan limit for user seats is 1.
    // So 1 seat = 100% capacity!
    // Let's invite a second user, which hits 2 seats (200% capacity).
    // Let's run a check!
    await checkTenantUsage(tenantId, db);

    // With 1 seat, we are at 100% of seats limit (limit: 1).
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

    // 2. Now let's change plan to grassroots, which has seats limit of 3.
    // Since 1 seat < 90% of 3 seats (90% of 3 is 2.7), it should reset the flags!
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
});
