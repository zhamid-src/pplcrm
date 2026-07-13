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
  await db.deleteFrom('files').where('tenant_id', '=', tenantId).execute();
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
    expect(freeLimits.subscribers).toBe(1000);
    expect(freeLimits.seats).toBe(2);

    const grassrootsLimits = getPlanLimits('grassroots');
    expect(grassrootsLimits.subscribers).toBe(5000);
    expect(grassrootsLimits.seats).toBe(5);

    const representativeLimits = getPlanLimits('representative');
    expect(representativeLimits.subscribers).toBe(25000);
    expect(representativeLimits.seats).toBe(15);

    // Movement seats are unlimited (null in the plan def → Infinity).
    const movementLimits = getPlanLimits('movement');
    expect(movementLimits.subscribers).toBe(100000);
    expect(movementLimits.seats).toBe(Number.POSITIVE_INFINITY);

    expect(freeLimits.storageBytes).toBeGreaterThan(0);
    expect(grassrootsLimits.storageBytes).toBeGreaterThan(freeLimits.storageBytes);
    expect(representativeLimits.storageBytes).toBeGreaterThan(grassrootsLimits.storageBytes);
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
    const storageAlert = jobs.find((j: any) => {
      const p = typeof j.payload === 'string' ? JSON.parse(j.payload) : j.payload;
      return p.type === 'send-transactional-email' && p.text?.includes('file storage');
    });
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
});
