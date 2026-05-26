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
        updatedby_id: userId,
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
        updatedby_id: userId,
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
        updatedby_id: userId,
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
        updatedby_id: userId,
      },
    });

    const stats = await repo.getCreatedStats({ tenant_id: tenantId, user_id: userId });
    expect(stats.total).toBe(1);
    expect(stats.last_created_at).toBeInstanceOf(Date);
  });

  it('should find potential duplicates by name + household and name + address', async () => {
    // 1. Name + Household duplicates (Jane Doe in same household)
    const p1 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Jane',
        last_name: 'Doe',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const p2 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'jane',
        last_name: 'doe',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    // 2. Name + Address duplicates (John Smith in different households but same address fingerprint)
    // Create a second household with same address fingerprint
    const householdId2 = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db.insertInto('households').values({
      id: householdId2,
      tenant_id: tenantId,
      campaign_id: campaignId,
      address_fp_full: '123 Main St, Springfield',
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    // Update first household's address fingerprint to match
    await db.updateTable('households')
      .set({ address_fp_full: '123 Main St, Springfield' })
      .where('id', '=', householdId)
      .execute();

    const p3 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'John',
        last_name: 'Smith',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const p4 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId2,
        first_name: 'john',
        last_name: 'smith',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const dups = await repo.findPotentialDuplicates(tenantId);
    expect(dups.length).toBeGreaterThanOrEqual(2);

    const householdGroup = dups.find(d => d.reason.includes('Same Household'));
    expect(householdGroup).toBeDefined();
    expect(householdGroup.persons.map((p: any) => p.id)).toContain(p1.id);
    expect(householdGroup.persons.map((p: any) => p.id)).toContain(p2.id);

    const addressGroup = dups.find(d => d.reason.includes('Same Address'));
    expect(addressGroup).toBeDefined();
    expect(addressGroup.persons.map((p: any) => p.id)).toContain(p3.id);
    expect(addressGroup.persons.map((p: any) => p.id)).toContain(p4.id);
  });

  it('should transactionally merge source person into target person', async () => {
    const target = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Primary',
        last_name: 'User',
        email: 'primary@example.com',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const source = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Primary',
        last_name: 'User',
        mobile: '123-456-7890',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const randTagId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db.insertInto('tags').values({
      id: randTagId,
      tenant_id: tenantId,
      name: 'MergeTag',
      deletable: true,
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    await db.insertInto('map_peoples_tags').values({
      tenant_id: tenantId,
      person_id: source.id,
      tag_id: randTagId,
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    await repo.mergePersons({
      tenant_id: tenantId,
      target_id: target.id,
      source_id: source.id,
      user_id: userId,
    });

    const updatedTarget = await repo.getOneBy('id', { tenant_id: tenantId, value: target.id });
    expect(updatedTarget?.mobile).toBe('123-456-7890');

    const targetTags = await db.selectFrom('map_peoples_tags')
      .where('tenant_id', '=', tenantId)
      .where('person_id', '=', target.id)
      .selectAll()
      .execute();
    expect(targetTags.map((t: any) => t.tag_id)).toContain(randTagId);

    const checkSource = await repo.getOneBy('id', { tenant_id: tenantId, value: source.id });
    expect(checkSource).toBeUndefined();
  });
});
