import type { Transaction } from 'kysely';
import { describe, it, expect, beforeEach } from 'vitest';

import type { Models } from '../../../../../libs/common/src/lib/kysely.models';
import { BaseRepository } from './base.repo';
import { useTestTransaction } from './test-utils/db-test-isolation';

class TestTagsRepo extends BaseRepository<'tags'> {
  constructor() {
    super('tags');
  }

  public override async addOrGet(
    input: {
      row: any;
      onConflictColumn: 'name';
    },
    trx?: Transaction<Models>,
  ) {
    const type = input.row.type ?? 'tag';
    const insertResult = await this.getInsert(trx)
      .values(input.row)
      .onConflict((oc) => oc.columns(['tenant_id', 'name', 'type']).doNothing())
      .returningAll()
      .executeTakeFirst();

    if (insertResult) return insertResult as any;

    return this.getSelect(trx)
      .selectAll()
      .where('tenant_id', '=', input.row.tenant_id)
      .where('name', '=', input.row.name)
      .where('type', '=', type)
      .executeTakeFirst() as any;
  }
}

async function seedTenant(trx: Transaction<Models>) {
  const rand = () => String(Math.floor(Math.random() * 100000000) + 10000000);
  const tenantId = rand();
  const userId = rand();
  const campaignId = rand();
  const householdId = rand();

  // 1. Tenant
  await trx
    .insertInto('tenants')
    .values({
      id: tenantId,
      name: 'Test Tenant',
    })
    .execute();

  // 2. User
  await trx
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

  // Update tenant admin and creator
  await trx.updateTable('tenants').set({ admin_id: userId, createdby_id: userId }).where('id', '=', tenantId).execute();

  // 3. Campaign
  await trx
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

  // 4. Household
  await trx
    .insertInto('households')
    .values({
      id: householdId,
      tenant_id: tenantId,
      campaign_id: campaignId,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  return { tenantId, userId, campaignId, householdId };
}

describe('BaseRepository', () => {
  const repo = new TestTagsRepo();
  // Opens a real Postgres transaction before each test and rolls it back
  // after (see db-test-isolation.ts). Every repo/db call below is passed
  // `ctx.trx` so nothing written during a test is ever committed -- no
  // manual seed/cleanup, no leaked rows on failure.
  const ctx = useTestTransaction();
  let tenantId: string;
  let userId: string;

  beforeEach(async () => {
    const seed = await seedTenant(ctx.trx);
    tenantId = seed.tenantId;
    userId = seed.userId;
  });

  it('should add a single row and fetch it', async () => {
    const row = await repo.add(
      {
        row: {
          tenant_id: tenantId,
          name: 'TestTag1',
          description: 'First test tag',
          color: '#ff0000',
          deletable: true,
          createdby_id: userId,
          updatedby_id: userId,
        },
      },
      ctx.trx,
    );

    expect(row).toBeDefined();
    expect(row.id).toBeDefined();
    expect(row.name).toBe('TestTag1');

    const exists = await repo.exists({ key: 'TestTag1', column: 'name' }, ctx.trx);
    expect(exists).toBe(true);

    const one = await repo.getOneBy('id', { tenant_id: tenantId, value: row.id }, ctx.trx);
    expect(one).toBeDefined();
    expect(one?.id).toBe(row.id);
  });

  it('should add multiple rows and list them', async () => {
    await repo.addMany(
      {
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
      },
      ctx.trx,
    );

    const count = await repo.count(tenantId, ctx.trx);
    expect(count).toBe(2);

    const all = await repo.getAll({ tenant_id: tenantId }, ctx.trx);
    expect(all).toHaveLength(2);

    const withCounts = await repo.getAllWithCounts({ tenant_id: tenantId }, ctx.trx);
    expect(withCounts.count).toBe(2);
    expect(withCounts.rows).toHaveLength(2);
  });

  it('getAllWithCounts returns the total count, not the current page size (SECURITY-REVIEW 2.3)', async () => {
    await repo.addMany(
      {
        rows: [1, 2, 3].map((n) => ({
          tenant_id: tenantId,
          name: `PageTag${n}`,
          deletable: true,
          createdby_id: userId,
          updatedby_id: userId,
        })),
      },
      ctx.trx,
    );

    // Request a single page of 2 out of 3 total rows.
    const page = await repo.getAllWithCounts({ tenant_id: tenantId, options: { startRow: 0, endRow: 2 } }, ctx.trx);

    expect(page.rows).toHaveLength(2); // page is limited...
    expect(page.count).toBe(3); // ...but count is the true total
  });

  it('should handle addOrGet conflict scenarios', async () => {
    const row1 = await repo.addOrGet(
      {
        row: {
          tenant_id: tenantId,
          name: 'ConflictTag',
          deletable: true,
          createdby_id: userId,
          updatedby_id: userId,
        },
        onConflictColumn: 'name',
      },
      ctx.trx,
    );

    expect(row1).toBeDefined();

    const row2 = await repo.addOrGet(
      {
        row: {
          tenant_id: tenantId,
          name: 'ConflictTag',
          deletable: true,
          createdby_id: userId,
          updatedby_id: userId,
        },
        onConflictColumn: 'name',
      },
      ctx.trx,
    );

    expect(row2).toBeDefined();
    expect(row2?.id).toBe(row1?.id);
  });

  it('should update a row', async () => {
    const row = await repo.add(
      {
        row: {
          tenant_id: tenantId,
          name: 'TagToUpdate',
          deletable: true,
          createdby_id: userId,
          updatedby_id: userId,
        },
      },
      ctx.trx,
    );

    const numUpdated = await repo.update(
      {
        tenant_id: tenantId,
        id: row.id,
        row: {
          description: 'Updated Description',
          color: '#00ff00',
        },
      },
      ctx.trx,
    );

    expect(numUpdated).toBeDefined();

    const updatedRow = await repo.getOneBy('id', { tenant_id: tenantId, value: row.id }, ctx.trx);
    expect(updatedRow?.description).toBe('Updated Description');
    expect(updatedRow?.color).toBe('#00ff00');
  });

  it('should delete rows', async () => {
    const row = await repo.add(
      {
        row: {
          tenant_id: tenantId,
          name: 'TagToDelete',
          deletable: true,
          createdby_id: userId,
          updatedby_id: userId,
        },
      },
      ctx.trx,
    );

    const deleted = await repo.delete({ tenant_id: tenantId, id: row.id }, ctx.trx);
    expect(deleted).toBe(true);

    const check = await repo.getOneBy('id', { tenant_id: tenantId, value: row.id }, ctx.trx);
    expect(check).toBeUndefined();
  });
});
