import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ListsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { IAuthKeyPayload } from '@common';

async function createTestSeed(db: any) {
  const rand = () => String(Math.floor(Math.random() * 100000000) + 10000000);
  const tenantId = rand();
  const userId = rand();
  const campaignId = rand();
  const householdId = rand();

  // 1. Tenant
  await db.insertInto('tenants').values({
    id: tenantId,
    name: 'Test Tenant',
  }).execute();

  // 2. User
  await db.insertInto('authusers').values({
    id: userId,
    tenant_id: tenantId,
    email: `test-${userId}@example.com`,
    password: 'password',
    first_name: 'Test',
    last_name: 'User',
    verified: true,
    createdby_id: userId,
    updatedby_id: userId,
  }).execute();

  // 3. Campaign
  await db.insertInto('campaigns').values({
    id: campaignId,
    tenant_id: tenantId,
    admin_id: userId,
    name: 'Test Campaign',
    createdby_id: userId,
    updatedby_id: userId,
  }).execute();

  // 4. Household
  await db.insertInto('households').values({
    id: householdId,
    tenant_id: tenantId,
    campaign_id: campaignId,
    createdby_id: userId,
    updatedby_id: userId,
  }).execute();

  // Update tenant admin, creator, and placeholder household
  await db.updateTable('tenants')
    .set({ 
      admin_id: userId, 
      createdby_id: userId,
      placeholder_household_id: householdId
    })
    .where('id', '=', tenantId)
    .execute();

  return { tenantId, userId, campaignId, householdId };
}

async function cleanTenant(db: any, tenantId: string) {
  // Allow any in-flight un-awaited background promises from lazy list refresh to finish
  await new Promise((resolve) => setTimeout(resolve, 150));

  await db.updateTable('tenants').set({ admin_id: null, createdby_id: null, placeholder_household_id: null }).where('id', '=', tenantId).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_lists_persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('lists').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('ListsController Background Refresh', () => {
  const controller = new ListsController();
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

  it('should enqueue a background job when creating a dynamic list', async () => {
    const list = await controller.addList({
      name: 'Dynamic Test List',
      description: 'A dynamic list for testing background jobs',
      object: 'people',
      is_dynamic: true,
      definition: {
        filterModel: {
          tags_expression: { kind: 'rule', field: 'tag', op: 'eq', value: 'Volunteer' }
        },
        tags: ['Volunteer']
      }
    }, auth);

    // Verify list status is refreshing
    const listInDb = await db.selectFrom('lists')
      .selectAll()
      .where('id', '=', list.id)
      .executeTakeFirst();
    expect(listInDb.status).toBe('refreshing');

    // Verify background job is enqueued
    const job = await db.selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    
    expect(job).toBeDefined();
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    expect(payload.type).toBe('refresh_list');
    expect(payload.list_id).toBe(list.id);
  });

  it('should enqueue a background job when updating a dynamic list definition', async () => {
    // 1. Pre-insert a dynamic list in idle state
    const listId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db.insertInto('lists').values({
      id: listId,
      tenant_id: tenantId,
      name: 'Dynamic Update List',
      object: 'people',
      is_dynamic: true,
      status: 'idle',
      definition: JSON.stringify({ tags: ['Subscribers'] }),
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    // 2. Update list definition
    await controller.updateList(listId, {
      definition: { tags: ['Donors'] }
    }, auth);

    // Poll the database until status is 'refreshing' and job is enqueued (max 2 seconds)
    let listInDb;
    let job;
    for (let i = 0; i < 20; i++) {
      listInDb = await db.selectFrom('lists')
        .select('status')
        .where('id', '=', listId)
        .executeTakeFirst();
      job = await db.selectFrom('background_jobs')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (listInDb?.status === 'refreshing' && job) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(listInDb?.status).toBe('refreshing');
    expect(job).toBeDefined();
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    expect(payload.type).toBe('refresh_list');
  });

  it('should execute list refresh and populate people mapping correctly', async () => {
    // 1. Add some test people
    const personId1 = String(Math.floor(Math.random() * 100000000) + 10000000);
    const personId2 = String(Math.floor(Math.random() * 100000000) + 10000000);
    
    await db.insertInto('persons').values({
      id: personId1,
      tenant_id: tenantId,
      campaign_id: campaignId,
      household_id: householdId,
      first_name: 'Alice',
      last_name: 'Smith',
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    await db.insertInto('persons').values({
      id: personId2,
      tenant_id: tenantId,
      campaign_id: campaignId,
      household_id: householdId,
      first_name: 'Bob',
      last_name: 'Jones',
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    // Attach "Volunteer" tag to Alice
    const tagId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db.insertInto('tags').values({
      id: tagId,
      tenant_id: tenantId,
      name: 'Volunteer',
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    await db.insertInto('map_peoples_tags').values({
      tenant_id: tenantId,
      person_id: personId1,
      tag_id: tagId,
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    // 2. Pre-insert a dynamic list targeting "Volunteer" tag
    const listId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db.insertInto('lists').values({
      id: listId,
      tenant_id: tenantId,
      name: 'Volunteers List',
      object: 'people',
      is_dynamic: true,
      status: 'refreshing',
      definition: JSON.stringify({ tags: ['Volunteer'] }),
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    // 3. Execute the actual refresh (usually called by worker)
    await controller.executeListRefresh(tenantId, listId, userId);

    // 4. Verify mappings in database: Alice should be present, Bob should not.
    const mappings = await db.selectFrom('map_lists_persons')
      .selectAll()
      .where('list_id', '=', listId)
      .execute();
    
    expect(mappings.length).toBe(1);
    expect(mappings[0].person_id).toBe(personId1);

    // Verify list status is back to idle and last_refreshed_at is set
    const list = await db.selectFrom('lists')
      .selectAll()
      .where('id', '=', listId)
      .executeTakeFirst();
    expect(list.status).toBe('idle');
    expect(list.last_refreshed_at).not.toBeNull();
  });

  it('should lazily trigger a refresh job when getOneById is called on a stale dynamic list', async () => {
    // 1. Pre-insert a dynamic list in idle state, but last_refreshed_at is 25 hours ago
    const listId = String(Math.floor(Math.random() * 100000000) + 10000000);
    const staleTime = new Date(Date.now() - 25 * 3600 * 1000);
    await db.insertInto('lists').values({
      id: listId,
      tenant_id: tenantId,
      name: 'Stale List',
      object: 'people',
      is_dynamic: true,
      status: 'idle',
      last_refreshed_at: staleTime,
      definition: JSON.stringify({ tags: ['Volunteer'] }),
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    // 2. Query the list by ID
    const list = await controller.getOneById({ tenant_id: tenantId, id: listId });
    expect(list).toBeDefined();

    // Poll the database until status is 'refreshing' and job is enqueued (max 2 seconds)
    let listInDb;
    let job;
    for (let i = 0; i < 20; i++) {
      listInDb = await db.selectFrom('lists')
        .selectAll()
        .where('id', '=', listId)
        .executeTakeFirst();
      job = await db.selectFrom('background_jobs')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (listInDb?.status === 'refreshing' && job) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(listInDb).toBeDefined();
    expect(listInDb.status).toBe('refreshing');
    expect(job).toBeDefined();
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    expect(payload.type).toBe('refresh_list');
    expect(payload.list_id).toBe(listId);
  });
});
