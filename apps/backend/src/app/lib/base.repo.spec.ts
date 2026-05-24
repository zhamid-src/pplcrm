import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseRepository } from './base.repo';

class TestTagsRepo extends BaseRepository<'tags'> {
  constructor() {
    super('tags');
  }

  public getDb() {
    return (BaseRepository as any)._db;
  }
}

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

describe('BaseRepository', () => {
  const repo = new TestTagsRepo();
  const db = repo.getDb();
  let tenantId: string;
  let userId: string;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  it('should add a single row and fetch it', async () => {
    const row = await repo.add({
      row: {
        tenant_id: tenantId,
        name: 'TestTag1',
        description: 'First test tag',
        color: '#ff0000',
        deletable: true,
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    expect(row).toBeDefined();
    expect(row.id).toBeDefined();
    expect(row.name).toBe('TestTag1');

    const exists = await repo.exists({ key: 'TestTag1', column: 'name' });
    expect(exists).toBe(true);

    const one = await repo.getOneBy('id', { tenant_id: tenantId, value: row.id });
    expect(one).toBeDefined();
    expect(one?.id).toBe(row.id);
  });

  it('should add multiple rows and list them', async () => {
    await repo.addMany({
      rows: [
        {
          tenant_id: tenantId,
          name: 'MultiTag1',
          deletable: true,
          createdby_id: userId,
          updatedby_id: userId,
        },
        {
          tenant_id: tenantId,
          name: 'MultiTag2',
          deletable: true,
          createdby_id: userId,
          updatedby_id: userId,
        },
      ],
    });

    const count = await repo.count(tenantId);
    expect(count).toBe(2);

    const all = await repo.getAll({ tenant_id: tenantId });
    expect(all).toHaveLength(2);

    const withCounts = await repo.getAllWithCounts({ tenant_id: tenantId });
    expect(withCounts.count).toBe(2);
    expect(withCounts.rows).toHaveLength(2);
  });

  it('should handle addOrGet conflict scenarios', async () => {
    const row1 = await repo.addOrGet({
      row: {
        tenant_id: tenantId,
        name: 'ConflictTag',
        deletable: true,
        createdby_id: userId,
        updatedby_id: userId,
      },
      onConflictColumn: 'name',
    });

    expect(row1).toBeDefined();

    const row2 = await repo.addOrGet({
      row: {
        tenant_id: tenantId,
        name: 'ConflictTag',
        deletable: true,
        createdby_id: userId,
        updatedby_id: userId,
      },
      onConflictColumn: 'name',
    });

    expect(row2).toBeDefined();
    expect(row2?.id).toBe(row1?.id);
  });

  it('should update a row', async () => {
    const row = await repo.add({
      row: {
        tenant_id: tenantId,
        name: 'TagToUpdate',
        deletable: true,
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const numUpdated = await repo.update({
      tenant_id: tenantId,
      id: row.id,
      row: {
        description: 'Updated Description',
        color: '#00ff00',
      },
    });

    expect(numUpdated).toBeDefined();

    const updatedRow = await repo.getOneBy('id', { tenant_id: tenantId, value: row.id });
    expect(updatedRow?.description).toBe('Updated Description');
    expect(updatedRow?.color).toBe('#00ff00');
  });

  it('should delete rows', async () => {
    const row = await repo.add({
      row: {
        tenant_id: tenantId,
        name: 'TagToDelete',
        deletable: true,
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const deleted = await repo.delete({ tenant_id: tenantId, id: row.id });
    expect(deleted).toBe(true);

    const check = await repo.getOneBy('id', { tenant_id: tenantId, value: row.id });
    expect(check).toBeUndefined();
  });
});
