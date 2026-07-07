import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IAuthKeyPayload } from '@common';

import { BaseRepository } from '../../lib/base.repo';
import { CanvassingController } from './controller';

type Db = typeof BaseRepository.dbInstance;

const rand = (): string => String(Math.floor(Math.random() * 100000000) + 10000000);

interface Seed {
  tenantId: string;
  userId: string;
  campaignId: string;
  listId: string;
  householdIds: string[];
}

/** Seed a tenant + a static household list of geocoded doors across two wards. */
async function seed(db: Db, opts: { geocoded: number; ungeocoded: number }): Promise<Seed> {
  const tenantId = rand();
  const userId = rand();
  const campaignId = rand();
  const listId = rand();

  await db.insertInto('tenants').values({ id: tenantId, name: 'Canvass Test' }).execute();
  await db
    .insertInto('authusers')
    .values({
      id: userId,
      tenant_id: tenantId,
      email: `t-${userId}@example.com`,
      password: 'x',
      first_name: 'T',
      last_name: 'U',
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
      name: 'C',
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();
  await db.updateTable('tenants').set({ admin_id: userId, createdby_id: userId }).where('id', '=', tenantId).execute();
  await db
    .insertInto('lists')
    .values({
      id: listId,
      tenant_id: tenantId,
      name: 'Persuasion universe',
      object: 'households',
      is_dynamic: false,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  const householdIds: string[] = [];
  for (let i = 0; i < opts.geocoded; i++) {
    const hid = rand();
    householdIds.push(hid);
    await db
      .insertInto('households')
      .values({
        id: hid,
        tenant_id: tenantId,
        campaign_id: campaignId,
        createdby_id: userId,
        updatedby_id: userId,
        street_num: String(100 + i),
        street1: 'Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        lat: 41.85 + (i % 8) * 0.001,
        lng: -87.69 + Math.floor(i / 8) * 0.001,
        ward: i % 2 === 0 ? 'W1' : 'W2',
        geocoding_status: 'success',
      })
      .execute();
    await db
      .insertInto('map_lists_households')
      .values({ tenant_id: tenantId, list_id: listId, household_id: hid, createdby_id: userId, updatedby_id: userId })
      .execute();
  }
  for (let i = 0; i < opts.ungeocoded; i++) {
    const hid = rand();
    householdIds.push(hid);
    await db
      .insertInto('households')
      .values({ id: hid, tenant_id: tenantId, campaign_id: campaignId, createdby_id: userId, updatedby_id: userId })
      .execute();
    await db
      .insertInto('map_lists_households')
      .values({ tenant_id: tenantId, list_id: listId, household_id: hid, createdby_id: userId, updatedby_id: userId })
      .execute();
  }

  return { tenantId, userId, campaignId, listId, householdIds };
}

async function cleanup(db: Db, tenantId: string): Promise<void> {
  await db.deleteFrom('turf_knocks').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('turf_assignments').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('turf_households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('turfs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_lists_households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('lists').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('CanvassingController', () => {
  const controller = new CanvassingController();
  const db = BaseRepository.dbInstance;
  let s: Seed;
  let auth: IAuthKeyPayload;

  beforeEach(async () => {
    s = await seed(db, { geocoded: 40, ungeocoded: 3 });
    auth = { tenant_id: s.tenantId, user_id: s.userId, name: 'T U', session_id: 'sess' };
  });

  afterEach(async () => {
    await cleanup(db, s.tenantId);
  });

  it('previews a cut with math that matches the engine, reporting unplaced doors', async () => {
    const preview = await controller.previewCut(auth, { list_id: s.listId, doors_per_turf: 20 });
    expect(preview.doors).toBe(40);
    expect(preview.unplaced).toBe(3);
    expect(preview.turfCount).toBeGreaterThanOrEqual(2);
    expect(preview.avgDoorsPerTurf).toBeGreaterThan(0);
  });

  it('cuts turfs (draft, unassigned) with doors, never crossing a ward', async () => {
    const res = await controller.cutTurfs(auth, { list_id: s.listId, doors_per_turf: 20 });
    expect(res.created).toBeGreaterThanOrEqual(2);
    expect(res.unplaced).toBe(3);

    const turfs = await controller.getTurfs(auth);
    expect(turfs.length).toBe(res.created);
    for (const t of turfs) {
      expect(t.status).toBe('draft');
      expect(t.team_id).toBeNull();
      expect(t.door_count).toBeGreaterThan(0);
      expect(['W1', 'W2', null]).toContain(t.ward);
    }
    // Every geocoded door placed exactly once across turfs.
    const total = turfs.reduce((n, t) => n + t.door_count, 0);
    expect(total).toBe(40);
  });

  it('assigns a turf, exposes it over its token, and syncs a knock back to progress', async () => {
    await controller.cutTurfs(auth, { list_id: s.listId, doors_per_turf: 40 });
    const [turf] = await controller.getTurfs(auth);
    if (!turf) throw new Error('expected a turf');

    const { token } = await controller.assignTurf(auth, { turf_id: turf.id, team_id: null });
    expect(token.length).toBeGreaterThan(10);

    const companion = await controller.getCompanionTurf(token);
    expect(companion.turf_id).toBe(turf.id);
    expect(companion.doors.length).toBe(turf.door_count);
    const door = companion.doors[0];
    if (!door) throw new Error('expected a door');

    const knock = await controller.logKnock({
      token,
      client_knock_id: 'knock-1',
      household_id: door.household_id,
      outcome: 'conversation',
      response: 'strong_support',
      canvasser_name: 'Sam Volunteer',
    });
    expect(knock.recorded).toBe(true);

    // Re-sending the SAME client_knock_id (offline re-sync) does not double-count.
    const dup = await controller.logKnock({
      token,
      client_knock_id: 'knock-1',
      household_id: door.household_id,
      outcome: 'conversation',
      response: 'strong_support',
    });
    expect(dup.recorded).toBe(false);

    const after = await controller.getTurfs(auth);
    const updated = after.find((t) => t.id === turf.id);
    expect(updated?.attempted).toBe(1);
    expect(updated?.conversations).toBe(1);
    expect(updated?.status).toBe('in_field');

    // Honest attribution written to the household activity log, real actor.
    const activity = await db
      .selectFrom('user_activity')
      .selectAll()
      .where('tenant_id', '=', s.tenantId)
      .where('entity', '=', 'household')
      .execute();
    expect(activity.length).toBe(1);
    expect(String(activity[0]?.createdby_id)).toBe(s.userId);
  });

  it('rejects a knock against a household that is not part of the turf', async () => {
    await controller.cutTurfs(auth, { list_id: s.listId, doors_per_turf: 40 });
    const [turf] = await controller.getTurfs(auth);
    if (!turf) throw new Error('expected a turf');
    const { token } = await controller.assignTurf(auth, { turf_id: turf.id, team_id: null });

    await expect(
      controller.logKnock({ token, client_knock_id: 'x', household_id: '999999999', outcome: 'no_answer' }),
    ).rejects.toThrow();
  });

  it('rejects an invalid Companion token', async () => {
    await expect(controller.getCompanionTurf('not-a-real-token')).rejects.toThrow();
  });

  it('summarises the field for the header sentence', async () => {
    await controller.cutTurfs(auth, { list_id: s.listId, doors_per_turf: 20 });
    const summary = await controller.getFieldSummary(auth);
    expect(summary.turfCount).toBeGreaterThanOrEqual(2);
    expect(summary.doorsTotal).toBe(40);
    expect(summary.doorsAttempted).toBe(0);
    // Freshly cut, everything is waiting for a canvasser.
    expect(summary.waitingCount).toBe(summary.turfCount);
    expect(summary.inFieldCount).toBe(0);
  });

  it('builds a field report from synced knocks', async () => {
    await controller.cutTurfs(auth, { list_id: s.listId, doors_per_turf: 40 });
    const [turf] = await controller.getTurfs(auth);
    if (!turf) throw new Error('expected a turf');
    const { token } = await controller.assignTurf(auth, { turf_id: turf.id, team_id: null });
    const companion = await controller.getCompanionTurf(token);
    await controller.logKnock({
      token,
      client_knock_id: 'a',
      household_id: companion.doors[0]!.household_id,
      outcome: 'conversation',
      response: 'lean_support',
      canvasser_name: 'Sam',
    });
    await controller.logKnock({
      token,
      client_knock_id: 'b',
      household_id: companion.doors[1]!.household_id,
      outcome: 'no_answer',
    });

    const report = await controller.getFieldReport(auth, { range: 'campaign' });
    expect(report.doors).toBe(2);
    expect(report.conversations).toBe(1);
    expect(report.supportIds).toBe(1);
    expect(report.contactRatePct).toBe(50);
    expect(report.topCanvassers[0]?.name).toBe('Sam');
  });

  it('refreshes a turf from its list, dropping members that left (knocks preserved)', async () => {
    await controller.cutTurfs(auth, { list_id: s.listId, doors_per_turf: 40 });
    const [turf] = await controller.getTurfs(auth);
    if (!turf) throw new Error('expected a turf');
    const { token } = await controller.assignTurf(auth, { turf_id: turf.id, team_id: null });
    const companion = await controller.getCompanionTurf(token);
    const droppedDoor = companion.doors[0]!.household_id;
    await controller.logKnock({ token, client_knock_id: 'k', household_id: droppedDoor, outcome: 'conversation' });

    // Remove that household from the list universe.
    await db
      .deleteFrom('map_lists_households')
      .where('tenant_id', '=', s.tenantId)
      .where('household_id', '=', droppedDoor)
      .execute();

    const result = await controller.refreshFromList(auth, turf.id);
    expect(result.removed).toBe(1);

    // The knock history survives even though the door was removed.
    const knocks = await db
      .selectFrom('turf_knocks')
      .selectAll()
      .where('tenant_id', '=', s.tenantId)
      .where('household_id', '=', droppedDoor)
      .execute();
    expect(knocks.length).toBe(1);
  });
});
