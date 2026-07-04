import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TagsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { ConflictError } from '../../errors/app-errors';
import type { IAuthKeyPayload } from '@common';

// TagsController's public methods (addTag/findByName/updateTag) all delegate to
// BaseController.add/update, which don't accept an optional trx parameter -- they
// always run against the module-level DB singleton. useTestTransaction() can't be
// used here since there's nowhere to inject the isolated transaction, so this spec
// falls back to manual seed/cleanup, matching the pattern in imports/controller.spec.ts.
async function createTestSeed(db: any) {
  const rand = () => String(Math.floor(Math.random() * 100000000) + 10000000);
  const tenantId = rand();
  const userId = rand();

  await db
    .insertInto('tenants')
    .values({
      id: tenantId,
      name: 'Test Tenant Tags',
    })
    .execute();

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

  await db.updateTable('tenants').set({ admin_id: userId, createdby_id: userId }).where('id', '=', tenantId).execute();

  return { tenantId, userId };
}

async function cleanTenant(db: any, tenantId: string) {
  await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('id', '=', tenantId).execute();
  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_households_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('TagsController Integration', () => {
  const controller = new TagsController();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let auth: IAuthKeyPayload;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
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

  it('should create a tag with sensible defaults when addTag is called', async () => {
    const created = await controller.addTag({ name: 'Volunteer' }, auth);

    expect(created).toBeDefined();
    expect(created.name).toBe('volunteer');
    expect(created.color).toBeNull();
    expect(created.type).toBe('tag');
    expect(created.tenant_id).toBe(tenantId);
    expect(created.createdby_id).toBe(userId);
    expect(created.updatedby_id).toBe(userId);
  });

  it('should create an issue-type tag when type is explicitly provided', async () => {
    const created = await controller.addTag({ name: 'Pothole', type: 'issue', color: '#ff0000' }, auth);

    expect(created.type).toBe('issue');
    expect(created.color).toBe('#ff0000');
  });

  it('should throw ConflictError when adding a tag with a duplicate name/type for the tenant', async () => {
    await controller.addTag({ name: 'Duplicate' }, auth);

    await expect(controller.addTag({ name: 'Duplicate' }, auth)).rejects.toThrow(ConflictError);
  });

  it('should allow the same name across different tag types for the same tenant', async () => {
    const tag = await controller.addTag({ name: 'Shared', type: 'tag' }, auth);
    const issue = await controller.addTag({ name: 'Shared', type: 'issue' }, auth);

    expect(tag.id).not.toBe(issue.id);
    expect(tag.type).toBe('tag');
    expect(issue.type).toBe('issue');
  });

  it('should find tags by name prefix, defaulting to type "tag"', async () => {
    await controller.addTag({ name: 'Donor' }, auth);
    await controller.addTag({ name: 'Donation Match', type: 'issue' }, auth);

    const results = await controller.findByName({ name: 'Don' }, auth);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('donor');
  });

  it('should find tags by name prefix filtered to the requested type', async () => {
    await controller.addTag({ name: 'Donor' }, auth);
    await controller.addTag({ name: 'Donation Match', type: 'issue' }, auth);

    const results = await controller.findByName({ name: 'Don', type: 'issue' }, auth);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('donation match');
  });

  it('should update a tag and stamp updatedby_id', async () => {
    const created = await controller.addTag({ name: 'Original' }, auth);

    const updated = await controller.updateTag(created.id, { description: 'A new description' }, auth);

    expect(updated.description).toBe('A new description');
    expect(updated.updatedby_id).toBe(userId);
    expect(updated.name).toBe('original');
  });

  it('should lowercase the name when updating a tag', async () => {
    const created = await controller.addTag({ name: 'Original' }, auth);

    const updated = await controller.updateTag(created.id, { name: 'RENAMED' }, auth);

    expect(updated.name).toBe('renamed');
  });
});
