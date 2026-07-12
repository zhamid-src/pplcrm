import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TeamsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { BadRequestError, NotFoundError } from '../../errors/app-errors';
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
      last_name: 'Volunteer',
      createdby_id: userId,
      updatedby_id: userId,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return String(result.id);
}

async function createList(db: any, tenantId: string, userId: string, campaignId: string) {
  const result = await db
    .insertInto('lists')
    .values({
      tenant_id: tenantId,
      campaign_id: campaignId,
      name: `List-${rand()}`,
      object: 'people',
      createdby_id: userId,
      updatedby_id: userId,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return String(result.id);
}

async function createForeignTenantPerson(db: any) {
  const foreignTenantId = rand();
  const foreignUserId = rand();
  const foreignCampaignId = rand();
  const foreignHouseholdId = rand();

  await db.insertInto('tenants').values({ id: foreignTenantId, name: 'Foreign Tenant' }).execute();
  await db
    .insertInto('authusers')
    .values({
      id: foreignUserId,
      tenant_id: foreignTenantId,
      email: `foreign-${foreignUserId}@example.com`,
      password: 'password',
      first_name: 'Foreign',
      last_name: 'User',
      verified: true,
      createdby_id: foreignUserId,
      updatedby_id: foreignUserId,
    })
    .execute();
  await db
    .insertInto('campaigns')
    .values({
      id: foreignCampaignId,
      tenant_id: foreignTenantId,
      admin_id: foreignUserId,
      name: 'Foreign Campaign',
      createdby_id: foreignUserId,
      updatedby_id: foreignUserId,
    })
    .execute();
  await db
    .insertInto('households')
    .values({
      id: foreignHouseholdId,
      tenant_id: foreignTenantId,
      campaign_id: foreignCampaignId,
      createdby_id: foreignUserId,
      updatedby_id: foreignUserId,
    })
    .execute();
  const person = await createPerson(db, foreignTenantId, foreignCampaignId, foreignHouseholdId, foreignUserId);

  return { foreignTenantId, personId: person };
}

async function cleanForeignTenant(db: any, foreignTenantId: string) {
  await db.deleteFrom('persons').where('tenant_id', '=', foreignTenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', foreignTenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', foreignTenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', foreignTenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', foreignTenantId).execute();
}

async function cleanTenant(db: any, tenantId: string) {
  await db
    .updateTable('tenants')
    .set({ admin_id: null, createdby_id: null, placeholder_household_id: null })
    .where('id', '=', tenantId)
    .execute();

  await db.deleteFrom('map_teams_persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_teams_lists').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('teams').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('lists').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('TeamsController', () => {
  const controller = new TeamsController();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let campaignId: string;
  let householdId: string;
  let auth: IAuthKeyPayload;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    campaignId = seed.campaignId;
    householdId = seed.householdId;

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

  it('should create a team, auto-tag volunteers, and set the captain', async () => {
    const captainId = await createPerson(db, tenantId, campaignId, householdId, userId);
    const memberId = await createPerson(db, tenantId, campaignId, householdId, userId);
    const listId = await createList(db, tenantId, userId, campaignId);

    const created = await controller.addTeam(auth, {
      name: 'Canvassing Team',
      description: 'Door knocking crew',
      team_captain_id: captainId,
      volunteer_ids: [captainId, memberId],
      list_ids: [listId],
    });

    expect(created.name).toBe('Canvassing Team');
    expect(created.team_captain_id).toBe(captainId);
    expect(created.volunteers.map((v) => v.id).sort()).toEqual([captainId, memberId].sort());
    expect(created.list_ids).toEqual([listId]);
    expect(created.lists[0]?.id).toBe(listId);

    // Volunteer tag should now be attached to both people
    const tagRows = await db
      .selectFrom('map_peoples_tags')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('person_id', 'in', [captainId, memberId])
      .execute();
    expect(tagRows).toHaveLength(2);
  });

  it('should reject creating a team with a volunteer id that does not belong to the tenant', async () => {
    const { foreignTenantId, personId } = await createForeignTenantPerson(db);
    try {
      await expect(
        controller.addTeam(auth, {
          name: 'Bad Team',
          volunteer_ids: [personId],
        }),
      ).rejects.toThrow(BadRequestError);
    } finally {
      await cleanForeignTenant(db, foreignTenantId);
    }
  });

  it('should delete a team and its volunteer mappings', async () => {
    const memberId = await createPerson(db, tenantId, campaignId, householdId, userId);
    const created = await controller.addTeam(auth, {
      name: 'Team To Delete',
      volunteer_ids: [memberId],
    });

    await controller.deleteTeam(auth, created.id);

    const teamRow = await db.selectFrom('teams').selectAll().where('id', '=', created.id).executeTakeFirst();
    expect(teamRow).toBeUndefined();

    const mapRows = await db.selectFrom('map_teams_persons').selectAll().where('team_id', '=', created.id).execute();
    expect(mapRows).toHaveLength(0);
  });

  it('should throw NotFoundError when getting a non-existent team', async () => {
    await expect(controller.getById(auth, rand())).rejects.toThrow(NotFoundError);
  });

  it('should return a team with captain name, lead user name, and lists', async () => {
    const captainId = await createPerson(db, tenantId, campaignId, householdId, userId);
    const listId = await createList(db, tenantId, userId, campaignId);

    const created = await controller.addTeam(auth, {
      name: 'Full Team',
      team_captain_id: captainId,
      team_lead_user_id: userId,
      volunteer_ids: [captainId],
      list_ids: [listId],
    });

    const fetched = await controller.getById(auth, created.id);
    expect(fetched.team_captain_name).toContain('Person');
    expect(fetched.team_lead_user_name).toBe('Test User');
    expect(fetched.list_ids).toEqual([listId]);
  });

  it('should throw NotFoundError when updating a non-existent team', async () => {
    await expect(controller.updateTeam(auth, rand(), { name: 'Nope' })).rejects.toThrow(NotFoundError);
  });

  it('should update a team name and replace its volunteers', async () => {
    const memberOne = await createPerson(db, tenantId, campaignId, householdId, userId);
    const memberTwo = await createPerson(db, tenantId, campaignId, householdId, userId);
    const created = await controller.addTeam(auth, {
      name: 'Old Name',
      volunteer_ids: [memberOne],
    });

    const updated = await controller.updateTeam(auth, created.id, {
      name: 'New Name',
      volunteer_ids: [memberTwo],
    });

    expect(updated.name).toBe('New Name');
    expect(updated.volunteers.map((v) => v.id)).toEqual([memberTwo]);
  });

  it('should reject updating a team with a volunteer that does not belong to the tenant', async () => {
    const created = await controller.addTeam(auth, { name: 'Reject Update Team' });
    const { foreignTenantId, personId } = await createForeignTenantPerson(db);

    try {
      await expect(controller.updateTeam(auth, created.id, { volunteer_ids: [personId] })).rejects.toThrow(
        BadRequestError,
      );
    } finally {
      await cleanForeignTenant(db, foreignTenantId);
    }
  });

  it('should list the teams a volunteer belongs to, including captain status', async () => {
    const captainId = await createPerson(db, tenantId, campaignId, householdId, userId);
    const created = await controller.addTeam(auth, {
      name: 'Volunteer Lookup Team',
      team_captain_id: captainId,
      volunteer_ids: [captainId],
    });

    const teams = await controller.getTeamsForVolunteer(auth, captainId);
    expect(teams).toHaveLength(1);
    expect(teams[0]?.id).toBe(created.id);
    expect(teams[0]?.is_captain).toBe(true);
  });

  it('should return an empty array of assigned lists when none are set, then the lists once assigned', async () => {
    const created = await controller.addTeam(auth, { name: 'List Team' });
    expect(await controller.getAssignedLists(auth, created.id)).toEqual([]);

    const listId = await createList(db, tenantId, userId, campaignId);
    await controller.updateTeam(auth, created.id, { list_ids: [listId] });

    const lists = await controller.getAssignedLists(auth, created.id);
    expect(lists.map((l) => l.id)).toEqual([listId]);
  });

  it('should return teams with volunteer counts via getAllTeams', async () => {
    const memberId = await createPerson(db, tenantId, campaignId, householdId, userId);
    await controller.addTeam(auth, { name: 'Counted Team', volunteer_ids: [memberId] });

    const result = await controller.getAllTeams(tenantId);
    expect(result.count).toBeGreaterThanOrEqual(1);
    const row = result.rows.find((r) => r['name'] === 'Counted Team') as Record<string, unknown> | undefined;
    expect(row).toBeDefined();
    expect(Number(row?.['volunteer_count'])).toBe(1);
  });
});
