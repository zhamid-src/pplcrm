import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PersonsRepo } from './persons.repo';
import { BaseRepository } from '../../../lib/base.repo';

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

  // Update tenant admin and creator
  await db.updateTable('tenants').set({ admin_id: userId, createdby_id: userId }).where('id', '=', tenantId).execute();

  // 3. Campaign
  await db.insertInto('campaigns').values({
    id: campaignId,
    tenant_id: tenantId,
    admin_id: userId,
    name: 'Test Campaign',
    createdby_id: userId,
  }).execute();

  // 4. Household
  await db.insertInto('households').values({
    id: householdId,
    tenant_id: tenantId,
    campaign_id: campaignId,
    createdby_id: userId,
  }).execute();

  return { tenantId, userId, campaignId, householdId };
}

async function cleanTenant(db: any, tenantId: string) {
  await db.updateTable('tenants').set({ admin_id: null, createdby_id: null, placeholder_household_id: null }).where('id', '=', tenantId).execute();
  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_households_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('sessions').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('PersonsRepo Integration', () => {
  const repo = new PersonsRepo();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let campaignId: string;
  let householdId: string;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    campaignId = seed.campaignId;
    householdId = seed.householdId;
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  it('should clear file_id for import', async () => {
    const importId = '123456';

    const person = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'File',
        last_name: 'User',
        file_id: importId,
        createdby_id: userId,
      },
    });

    expect(person.file_id).toBe(importId);

    const ids = await repo.getIdsByFileId({ tenant_id: tenantId, file_id: importId });
    expect(ids).toContain(person.id);

    await repo.clearFileIdForImport({ tenant_id: tenantId, import_id: importId, user_id: userId });

    const check = await repo.getOneBy('id', { tenant_id: tenantId, value: person.id });
    expect(check?.file_id).toBeNull();
  });

  it('should fetch persons by ids with tag filtering', async () => {
    const p1 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Tagged',
        last_name: 'One',
        createdby_id: userId,
      },
    });

    const p2 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Untagged',
        last_name: 'Two',
        createdby_id: userId,
      },
    });

    const randTagId = String(Math.floor(Math.random() * 100000000) + 10000000);
    const tag = await db.insertInto('tags').values({
      id: randTagId,
      tenant_id: tenantId,
      name: 'TestTag',
      deletable: true,
      createdby_id: userId,
      updatedby_id: userId,
    }).returningAll().execute();

    await db.insertInto('map_peoples_tags').values({
      tenant_id: tenantId,
      person_id: p1.id,
      tag_id: randTagId,
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    // Fetch without tag filtering
    const allFetched = await repo.getByIds({ tenant_id: tenantId, ids: [p1.id, p2.id] });
    expect(allFetched).toHaveLength(2);

    // Fetch with tag filtering
    const taggedFetched = await repo.getByIds({ tenant_id: tenantId, ids: [p1.id, p2.id], tags: ['TestTag'] });
    expect(taggedFetched).toHaveLength(1);
    expect(taggedFetched[0].id).toBe(p1.id);
  });

  it('should retrieve created stats', async () => {
    await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Stats',
        last_name: 'User',
        createdby_id: userId,
      },
    });

    const stats = await repo.getCreatedStats({ tenant_id: tenantId, user_id: userId });
    expect(stats.total).toBe(1);
    expect(stats.last_created_at).toBeInstanceOf(Date);
  });
});
