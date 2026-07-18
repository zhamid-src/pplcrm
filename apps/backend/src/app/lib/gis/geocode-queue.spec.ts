import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseRepository } from '../../lib/base.repo';
import * as geocodeAddress from './geocode-address';
import { enqueueGeocodeJobs } from './geocode-queue';

const rand = (): string => String(Math.floor(Math.random() * 100000000) + 10000000);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test reaches the shared Kysely handle
const db = (BaseRepository as any)._db;

async function geocodeJobs(tenantId: string): Promise<{ run_at: Date }[]> {
  const rows = await db
    .selectFrom('background_jobs')
    .select('run_at')
    .where('tenant_id', '=', tenantId)
    .where('status', '=', 'pending')
    .execute();
  return rows as { run_at: Date }[];
}

async function statuses(tenantId: string): Promise<string[]> {
  const rows = await db.selectFrom('households').select('geocoding_status').where('tenant_id', '=', tenantId).execute();
  return rows.map((r: { geocoding_status: string | null }) => r.geocoding_status ?? 'null');
}

describe('enqueueGeocodeJobs (plan gate + daily budget)', () => {
  let tenantId: string;
  let userId: string;
  let ids: string[];

  async function seedHouseholds(count: number): Promise<string[]> {
    const made: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = rand();
      await db
        .insertInto('households')
        .values({
          id,
          tenant_id: tenantId,
          street_num: String(100 + i),
          street1: 'Main St',
          city: 'Ottawa',
          geocoding_status: 'pending',
          createdby_id: userId,
          updatedby_id: userId,
        })
        .execute();
      made.push(id);
    }
    return made;
  }

  beforeEach(async () => {
    vi.restoreAllMocks();
    tenantId = rand();
    userId = rand();
    await db.insertInto('tenants').values({ id: tenantId, name: 'Geo Test Tenant' }).execute();
    // households.createdby_id is a NOT NULL FK to authusers.
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
  });

  afterEach(async () => {
    // Delete in FK order: households.createdby_id → authusers → tenants.
    await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
  });

  it('in mock/test mode enqueues immediately for everyone regardless of plan (demo/dev/CI pins)', async () => {
    vi.spyOn(geocodeAddress, 'isMockOrTestGeocode').mockReturnValue(true);
    await db.updateTable('tenants').set({ subscription_plan: 'free' }).where('id', '=', tenantId).execute();
    ids = await seedHouseholds(3);

    await enqueueGeocodeJobs(db, tenantId, ids);

    expect(await geocodeJobs(tenantId)).toHaveLength(3);
  });

  it('with a real key, skips geocoding on lower tiers — marks skipped, enqueues nothing', async () => {
    vi.spyOn(geocodeAddress, 'isMockOrTestGeocode').mockReturnValue(false);
    await db.updateTable('tenants').set({ subscription_plan: 'grassroots' }).where('id', '=', tenantId).execute();
    ids = await seedHouseholds(3);

    await enqueueGeocodeJobs(db, tenantId, ids);

    expect(await geocodeJobs(tenantId)).toHaveLength(0);
    expect((await statuses(tenantId)).every((s) => s === 'skipped')).toBe(true);
  });

  it('with a real key, geocodes Movement tenants', async () => {
    vi.spyOn(geocodeAddress, 'isMockOrTestGeocode').mockReturnValue(false);
    await db.updateTable('tenants').set({ subscription_plan: 'movement' }).where('id', '=', tenantId).execute();
    ids = await seedHouseholds(3);

    await enqueueGeocodeJobs(db, tenantId, ids);

    expect(await geocodeJobs(tenantId)).toHaveLength(3);
    expect((await statuses(tenantId)).every((s) => s === 'pending')).toBe(true);
  });

  it('exempts demo-mode tenants from the plan gate (sample workspace keeps its pins)', async () => {
    vi.spyOn(geocodeAddress, 'isMockOrTestGeocode').mockReturnValue(false);
    await db
      .updateTable('tenants')
      .set({ subscription_plan: 'free', demo_mode_at: new Date() })
      .where('id', '=', tenantId)
      .execute();
    ids = await seedHouseholds(2);

    await enqueueGeocodeJobs(db, tenantId, ids);

    expect(await geocodeJobs(tenantId)).toHaveLength(2);
  });

  it('spreads a large Movement import across days at the daily budget', async () => {
    vi.spyOn(geocodeAddress, 'isMockOrTestGeocode').mockReturnValue(false);
    await db.updateTable('tenants').set({ subscription_plan: 'movement' }).where('id', '=', tenantId).execute();
    ids = await seedHouseholds(5);

    // Budget of 2/day over 5 households → 2 today, 2 tomorrow, 1 the day after.
    await enqueueGeocodeJobs(db, tenantId, ids, 2);

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const DAY_MS = 24 * 60 * 60 * 1000;
    const byDay = new Map<number, number>();
    for (const job of await geocodeJobs(tenantId)) {
      const offset = Math.floor((new Date(job.run_at).getTime() - dayStart.getTime()) / DAY_MS);
      byDay.set(offset, (byDay.get(offset) ?? 0) + 1);
    }
    expect(byDay.get(0)).toBe(2);
    expect(byDay.get(1)).toBe(2);
    expect(byDay.get(2)).toBe(1);
  });
});
