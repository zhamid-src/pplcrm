import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IAuthKeyPayload } from '@common';

import { BaseRepository } from '../../lib/base.repo';
import { generateToken, hashToken } from '../../lib/token-hash';
import { DeliveriesController } from './controller';

type Db = typeof BaseRepository.dbInstance;

const rand = (): string => String(Math.floor(Math.random() * 100000000) + 10000000);

interface Seed {
  tenantId: string;
  adminId: string;
  organizerId: string;
  campaignId: string;
  volunteerPersonId: string;
  routeId: string;
  routeToken: string;
  stopIds: string[]; // in seq order 1..3
}

/** Seed a tenant with a three-stop route whose share link belongs to a volunteer person. */
async function seed(db: Db): Promise<Seed> {
  const tenantId = rand();
  const adminId = rand();
  const organizerId = rand();
  const campaignId = rand();
  const volunteerPersonId = rand();
  const routeToken = generateToken();

  await db.insertInto('tenants').values({ id: tenantId, name: 'Deliveries Test' }).execute();
  for (const [id, role, first] of [
    [adminId, 'admin', 'Avery'],
    [organizerId, 'user', 'Sam'],
  ] as const) {
    await db
      .insertInto('authusers')
      .values({
        id,
        tenant_id: tenantId,
        email: `t-${id}@example.com`,
        password: 'x',
        first_name: first,
        last_name: 'Staff',
        role,
        verified: true,
        createdby_id: id,
        updatedby_id: id,
      })
      .execute();
  }
  await db
    .insertInto('campaigns')
    .values({
      id: campaignId,
      tenant_id: tenantId,
      admin_id: adminId,
      name: 'C',
      createdby_id: adminId,
      updatedby_id: adminId,
    })
    .execute();

  // The volunteer driving the route.
  const volunteerHouseholdId = rand();
  await db
    .insertInto('households')
    .values({
      id: volunteerHouseholdId,
      tenant_id: tenantId,
      campaign_id: campaignId,
      createdby_id: organizerId,
      updatedby_id: organizerId,
    })
    .execute();
  await db
    .insertInto('persons')
    .values({
      id: volunteerPersonId,
      tenant_id: tenantId,
      household_id: volunteerHouseholdId,
      first_name: 'Jordan',
      last_name: 'Rivera',
      email: 'jordan@example.com',
      mobile: '(613) 555-0142',
      createdby_id: organizerId,
      updatedby_id: organizerId,
    })
    .execute();

  // delivery_* ids are GENERATED ALWAYS — let Postgres assign them.
  const routeRow = await db
    .insertInto('delivery_routes')
    .values({
      tenant_id: tenantId,
      campaign_id: campaignId,
      name: 'Maple St area — test',
      status: 'assigned',
      volunteer_person_id: volunteerPersonId,
      start_address: '1 Test Way',
      start_lat: 45.0,
      start_lng: -75.0,
      est_minutes: 30,
      est_km: 5,
      share_token_hash: hashToken(routeToken),
      share_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      params: JSON.stringify({}),
      createdby_id: organizerId,
      updatedby_id: organizerId,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  const routeId = String(routeRow.id);

  const stopIds: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const householdId = rand();
    await db
      .insertInto('households')
      .values({
        id: householdId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        street_num: String(i),
        street1: 'Maple St',
        lat: 45.0 + i / 1000,
        lng: -75.0 - i / 1000,
        createdby_id: organizerId,
        updatedby_id: organizerId,
      })
      .execute();
    const requestRow = await db
      .insertInto('delivery_requests')
      .values({
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        person_id: null,
        source: 'manual',
        status: 'approved',
        createdby_id: organizerId,
        updatedby_id: organizerId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const stopRow = await db
      .insertInto('delivery_route_stops')
      .values({
        tenant_id: tenantId,
        route_id: routeId,
        request_id: String(requestRow.id),
        seq: i,
        leg_minutes: 2,
        status: 'pending',
        createdby_id: organizerId,
        updatedby_id: organizerId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    stopIds.push(String(stopRow.id));
  }

  return { tenantId, adminId, organizerId, campaignId, volunteerPersonId, routeId, routeToken, stopIds };
}

/** Insert an approved companion volunteer + device session directly; returns the raw session token. */
async function mintApprovedSession(db: Db, tenantId: string, personId: string, createdBy: string): Promise<string> {
  const volunteer = await db
    .insertInto('companion_volunteers')
    .values({
      tenant_id: tenantId,
      person_id: personId,
      status: 'approved',
      verified_at: new Date(),
      approved_by: createdBy,
      approved_at: new Date(),
      createdby_id: createdBy,
      updatedby_id: createdBy,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  const raw = generateToken();
  await db
    .insertInto('companion_sessions')
    .values({
      tenant_id: tenantId,
      volunteer_id: volunteer.id,
      token_hash: hashToken(raw),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .execute();
  return raw;
}

async function cleanup(db: Db, tenantId: string): Promise<void> {
  await db.deleteFrom('companion_ops').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('companion_sessions').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('companion_volunteers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('delivery_route_stops').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('delivery_requests').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('delivery_routes').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('DeliveriesController — public volunteer path', () => {
  const controller = new DeliveriesController();
  const db = BaseRepository.dbInstance;
  let s: Seed;
  let staffAuth: IAuthKeyPayload;

  beforeEach(async () => {
    s = await seed(db);
    staffAuth = { tenant_id: s.tenantId, user_id: s.organizerId, name: 'Sam Staff', session_id: 'sess', role: 'user' };
  });

  afterEach(async () => {
    await cleanup(db, s.tenantId);
  });

  it('getPublicRoute requires an approved companion session and then returns the minimized payload', async () => {
    // A bare capability link is no longer enough — the stranger with a forwarded URL gets the wall.
    await expect(controller.getPublicRoute(s.routeToken, null)).rejects.toThrow(/verification/i);

    const session = await mintApprovedSession(db, s.tenantId, s.volunteerPersonId, s.organizerId);
    const payload = await controller.getPublicRoute(s.routeToken, session);
    expect(payload).not.toBeNull();
    expect(payload?.organization_name).toBeTruthy();
    expect(payload?.stops).toHaveLength(3);

    // Payload minimization (spec §4.4): first name + address only — never
    // emails, phones, notes, or person/request ids.
    const stopKeys = Object.keys(payload?.stops[0] ?? {}).sort();
    expect(stopKeys).toEqual(['acted_at', 'address', 'first_name', 'id', 'lat', 'lng', 'reason', 'seq', 'status']);
    expect(JSON.stringify(payload)).not.toMatch(/email|phone|mobile|person_id|request_id/);

    // A session for someone else's volunteer identity is rejected.
    await expect(controller.getPublicRoute(s.routeToken, generateToken())).rejects.toThrow(/verification/i);
  });

  it('a replayed stop action with the same op_id applies exactly once', async () => {
    const session = await mintApprovedSession(db, s.tenantId, s.volunteerPersonId, s.organizerId);
    const [a, b, c] = s.stopIds;
    const opX = `op-${rand()}-x`;
    const opY = `op-${rand()}-y`;

    const orderOf = (payload: { stops: { id: string }[] } | null): string[] =>
      (payload?.stops ?? []).map((stop) => stop.id);

    // Defer A → B, C, A. Then defer B → C, A, B.
    const first = await controller.publicStopAction(s.routeToken, String(a), 'defer', null, session, opX);
    expect(orderOf(first)).toEqual([b, c, a]);
    const second = await controller.publicStopAction(s.routeToken, String(b), 'defer', null, session, opY);
    expect(orderOf(second)).toEqual([c, a, b]);

    // Replaying the first defer must NOT move A to the end again — the ledger
    // swallows it and we get the current authoritative payload back.
    const replay = await controller.publicStopAction(s.routeToken, String(a), 'defer', null, session, opX);
    expect(orderOf(replay)).toEqual([c, a, b]);
  });

  it('mintShareLink refuses a route with no volunteer attached', async () => {
    await db
      .updateTable('delivery_routes')
      .set({ volunteer_person_id: null, share_token_hash: null, share_token_expires_at: null })
      .where('tenant_id', '=', s.tenantId)
      .where('id', '=', s.routeId)
      .execute();
    await expect(controller.mintShareLink(staffAuth, { route_id: s.routeId })).rejects.toThrow(/assign a volunteer/i);
  });
});
