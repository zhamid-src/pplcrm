import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TagsRepo } from './tags.repo';
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

describe('TagsRepo Integration', () => {
  const repo = new TagsRepo();
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

  it('should ensure system tags exist', async () => {
    await repo.ensureSystemTags({ tenant_id: tenantId, user_id: userId });

    const all = await repo.getAll({ tenant_id: tenantId });
    expect(all.length).toBeGreaterThan(0);

    const systemTag = all.find(t => t.deletable === false);
    expect(systemTag).toBeDefined();
  });

  it('should delete tags and their mapping associations', async () => {
    const tag = await repo.add({
      row: {
        tenant_id: tenantId,
        name: 'DeletableTag',
        deletable: true,
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    await db.insertInto('map_households_tags').values({
      tenant_id: tenantId,
      household_id: householdId,
      tag_id: tag.id,
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    // Verify mapping exists
    const mapping = await db.selectFrom('map_households_tags').selectAll().where('tag_id', '=', tag.id).execute();
    expect(mapping).toHaveLength(1);

    // Delete tag
    const deleted = await repo.deleteMany({ tenant_id: tenantId, ids: [tag.id] });
    expect(deleted).toBe(true);

    // Verify tag is deleted
    const checkTag = await repo.getOneBy('id', { tenant_id: tenantId, value: tag.id });
    expect(checkTag).toBeUndefined();

    // Verify mapping is deleted
    const checkMapping = await db.selectFrom('map_households_tags').selectAll().where('tag_id', '=', tag.id).execute();
    expect(checkMapping).toHaveLength(0);
  });
});
