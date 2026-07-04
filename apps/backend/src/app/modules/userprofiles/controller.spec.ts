import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserProfilesController } from './controller';
import { BaseRepository } from '../../lib/base.repo';

function rand() {
  return String(Math.floor(Math.random() * 100000000) + 10000000);
}

async function createTestSeed(db: any) {
  const tenantId = rand();
  const userId = rand();

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

  return { tenantId, userId };
}

async function cleanTenant(db: any, tenantId: string) {
  await db.deleteFrom('profiles').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('UserProfilesController', () => {
  const controller = new UserProfilesController();
  const db = (BaseRepository as any)._db;
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

  it('should create a profile and read it back by id', async () => {
    const created = (await controller.add({
      id: rand(),
      tenant_id: tenantId,
      auth_id: userId,
      last_name: 'Smith',
      createdby_id: userId,
      updatedby_id: userId,
    } as any)) as { id: string };

    expect(created).toBeDefined();

    const fetched = (await controller.getOneById({ tenant_id: tenantId, id: String(created.id) })) as
      | { last_name: string }
      | undefined;
    expect(fetched?.last_name).toBe('Smith');
  });

  it('should return undefined when fetching a profile that does not exist', async () => {
    const fetched = await controller.getOneById({ tenant_id: tenantId, id: rand() });
    expect(fetched).toBeUndefined();
  });

  it('should update an existing profile', async () => {
    const created = (await controller.add({
      id: rand(),
      tenant_id: tenantId,
      auth_id: userId,
      last_name: 'Old Name',
      createdby_id: userId,
      updatedby_id: userId,
    } as any)) as { id: string };

    const updated = (await controller.update({
      tenant_id: tenantId,
      id: String(created.id),
      row: { last_name: 'New Name', updatedby_id: userId } as any,
    })) as { last_name: string } | undefined;

    expect(updated?.last_name).toBe('New Name');
  });

  it('should not update a profile belonging to a different tenant', async () => {
    const created = (await controller.add({
      id: rand(),
      tenant_id: tenantId,
      auth_id: userId,
      last_name: 'Original',
      createdby_id: userId,
      updatedby_id: userId,
    } as any)) as { id: string };

    const result = await controller.update({
      tenant_id: rand(),
      id: String(created.id),
      row: { last_name: 'Hijacked' } as any,
    });
    expect(result).toBeUndefined();

    const stillOriginal = await db.selectFrom('profiles').selectAll().where('id', '=', created.id).executeTakeFirst();
    expect(stillOriginal.last_name).toBe('Original');
  });

  it('should delete a profile', async () => {
    const created = (await controller.add({
      id: rand(),
      tenant_id: tenantId,
      auth_id: userId,
      last_name: 'To Delete',
      createdby_id: userId,
      updatedby_id: userId,
    } as any)) as { id: string };

    await controller.delete(tenantId as any, String(created.id), userId);

    const row = await db.selectFrom('profiles').selectAll().where('id', '=', created.id).executeTakeFirst();
    expect(row).toBeUndefined();
  });

  it('should list all profiles for a tenant', async () => {
    await controller.add({
      id: rand(),
      tenant_id: tenantId,
      auth_id: userId,
      last_name: 'Listed',
      createdby_id: userId,
      updatedby_id: userId,
    } as any);

    const rows = await controller.getAll(tenantId);
    expect(rows.some((r) => (r as any).last_name === 'Listed')).toBe(true);
  });
});
