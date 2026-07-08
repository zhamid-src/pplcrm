import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PersonConnectionsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import type { IAuthKeyPayload } from '@common';

function rand() {
  return String(Math.floor(Math.random() * 100000000) + 10000000);
}

async function createTestSeed(db: any) {
  const tenantId = rand();
  const userId = rand();
  const campaignId = rand();
  const householdId = rand();

  await db.insertInto('tenants').values({ id: tenantId, name: 'Test Tenant' }).execute();

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

  return { tenantId, userId, campaignId, householdId };
}

async function createPerson(db: any, tenantId: string, campaignId: string, householdId: string, userId: string) {
  const result = await db
    .insertInto('persons')
    .values({
      tenant_id: tenantId,
      campaign_id: campaignId,
      household_id: householdId,
      first_name: `Person-${rand()}`,
      last_name: 'Test',
      createdby_id: userId,
      updatedby_id: userId,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return String(result.id);
}

async function cleanTenant(db: any, tenantId: string) {
  await db
    .updateTable('tenants')
    .set({ admin_id: null, createdby_id: null, placeholder_household_id: null })
    .where('id', '=', tenantId)
    .execute();

  await db.deleteFrom('person_connections').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('PersonConnectionsController', () => {
  const controller = new PersonConnectionsController();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let personA: string;
  let personB: string;
  let auth: IAuthKeyPayload;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    personA = await createPerson(db, tenantId, seed.campaignId, seed.householdId, userId);
    personB = await createPerson(db, tenantId, seed.campaignId, seed.householdId, userId);

    auth = {
      tenant_id: tenantId,
      user_id: userId,
      name: 'Test User',
      session_id: 'test-session',
    };
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  it('should create a connection between two people', async () => {
    const result = await controller.addConnection(
      personA,
      { to_person_id: personB, relation_type: 'close_friend', is_mutual: false },
      auth,
    );

    expect(result).toBeDefined();
    const row = await db
      .selectFrom('person_connections')
      .selectAll()
      .where('from_person_id', '=', personA)
      .where('to_person_id', '=', personB)
      .executeTakeFirst();
    expect(row).toBeDefined();
    expect(row.relation_type).toBe('close_friend');
  });

  it('should reject a duplicate connection of the same type between the same two people', async () => {
    await controller.addConnection(personA, { to_person_id: personB, relation_type: 'colleague' }, auth);

    await expect(
      controller.addConnection(personA, { to_person_id: personB, relation_type: 'colleague' }, auth),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('should list connections for a person, including mutual connections from the other side', async () => {
    await controller.addConnection(personA, { to_person_id: personB, relation_type: 'spouse', is_mutual: true }, auth);

    const forA = await controller.getForPerson(personA, auth);
    expect(forA).toHaveLength(1);

    const forB = await controller.getForPerson(personB, auth);
    expect(forB).toHaveLength(1);
    expect(forB[0]?.relation_type).toBe('spouse');
  });

  it('should not include a non-mutual connection when queried from the target person', async () => {
    await controller.addConnection(
      personA,
      { to_person_id: personB, relation_type: 'referred_to', is_mutual: false },
      auth,
    );

    const forB = await controller.getForPerson(personB, auth);
    expect(forB).toHaveLength(0);
  });

  it('should count connections for a person', async () => {
    await controller.addConnection(personA, { to_person_id: personB, relation_type: 'colleague' }, auth);
    const count = await controller.countForPerson(personA, auth);
    expect(count).toBe(1);
  });

  it('should throw NOT_FOUND when removing a connection that does not exist', async () => {
    await expect(controller.removeConnection(rand(), auth)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('should remove an existing connection', async () => {
    const created = (await controller.addConnection(
      personA,
      { to_person_id: personB, relation_type: 'colleague' },
      auth,
    )) as { id: string };

    const result = await controller.removeConnection(String(created.id), auth);
    expect(result).toEqual({ success: true });

    const row = await db.selectFrom('person_connections').selectAll().where('id', '=', created.id).executeTakeFirst();
    expect(row).toBeUndefined();
  });
});
