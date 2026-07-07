import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CROCKFORD_ALPHABET, extractPublicIdFromSlug } from '@common';
import type { IAuthKeyPayload } from '@common';

import { BaseRepository } from '../../lib/base.repo';
import {
  MAX_PUBLIC_ID_ATTEMPTS,
  backfillPersonPublicIds,
  generatePersonPublicId,
  insertPersonWithPublicId,
  isPersonPublicIdConflict,
} from '../../lib/person-public-id';
import { PersonsController } from './controller';
import { PersonsService } from './services/persons.service';

const CROCKFORD_SET = new Set(CROCKFORD_ALPHABET);

function rand(): string {
  return String(Math.floor(Math.random() * 100000000) + 10000000);
}

function isCanonicalPublicId(value: unknown): boolean {
  if (typeof value !== 'string' || value.length !== 8) return false;
  for (const ch of value) if (!CROCKFORD_SET.has(ch)) return false;
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // addPerson resolves the current campaign from settings.
  await db
    .insertInto('settings')
    .values({
      tenant_id: tenantId,
      key: 'current_campaign',
      value: { id: Number(campaignId) },
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  return { tenantId, userId, campaignId, householdId };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cleanTenant(db: any, tenantId: string) {
  await db
    .updateTable('tenants')
    .set({ admin_id: null, createdby_id: null, placeholder_household_id: null })
    .where('id', '=', tenantId)
    .execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('person public_id generation', () => {
  // A non-conflict error must propagate; a conflict must be recognized precisely.
  it('recognizes only the persons_tenant_public_id_unique 23505 error', () => {
    expect(isPersonPublicIdConflict({ code: '23505', constraint: 'persons_tenant_public_id_unique' })).toBe(true);
    expect(isPersonPublicIdConflict({ code: '23505', constraint: 'persons_email_unique' })).toBe(false);
    expect(isPersonPublicIdConflict({ code: '23503' })).toBe(false);
    expect(isPersonPublicIdConflict(new Error('boom'))).toBe(false);
    expect(isPersonPublicIdConflict(null)).toBe(false);
  });

  it('generates 8-char canonical Crockford ids', () => {
    for (let i = 0; i < 50; i++) expect(isCanonicalPublicId(generatePersonPublicId())).toBe(true);
  });

  it('retries on a public_id conflict, then succeeds with a fresh id', async () => {
    const conflict = { code: '23505', constraint: 'persons_tenant_public_id_unique' };
    const seen: string[] = [];
    let calls = 0;
    const result = await insertPersonWithPublicId('Joseph', 'Bloggs', (publicId, slug) => {
      calls += 1;
      seen.push(publicId);
      if (calls < 3) return Promise.reject(conflict);
      return Promise.resolve({ publicId, slug });
    });
    expect(calls).toBe(3);
    expect(new Set(seen).size).toBe(3); // a fresh id each attempt
    expect(isCanonicalPublicId(result.publicId)).toBe(true);
    expect(result.slug).toBe(
      `joseph-${result.publicId.toLowerCase().slice(0, 4)}-${result.publicId.toLowerCase().slice(4)}`,
    );
  });

  it('gives up after MAX_PUBLIC_ID_ATTEMPTS conflicts', async () => {
    const conflict = { code: '23505', constraint: 'persons_tenant_public_id_unique' };
    let calls = 0;
    await expect(
      insertPersonWithPublicId('A', 'B', () => {
        calls += 1;
        return Promise.reject(conflict);
      }),
    ).rejects.toBe(conflict);
    expect(calls).toBe(MAX_PUBLIC_ID_ATTEMPTS);
  });

  it('propagates a non-conflict error without retrying', async () => {
    const other = new Error('some other failure');
    let calls = 0;
    await expect(
      insertPersonWithPublicId('A', 'B', () => {
        calls += 1;
        return Promise.reject(other);
      }),
    ).rejects.toBe(other);
    expect(calls).toBe(1);
  });
});

describe('person public_id end-to-end against the real DB', () => {
  const service = new PersonsService();
  const controller = new PersonsController();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let householdId: string;
  let auth: IAuthKeyPayload;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    householdId = seed.householdId;
    auth = { tenant_id: tenantId, user_id: userId, name: 'Test User', session_id: 'test-session' };
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  it('creates a person with a canonical public_id and a {name}-xxxx-xxxx slug', async () => {
    const created = (await service.addPerson(
      { first_name: 'Joseph', last_name: 'Bloggs', household_id: householdId } as never,
      auth,
    )) as Record<string, unknown>;

    expect(isCanonicalPublicId(created['public_id'])).toBe(true);
    const slug = created['slug'];
    expect(typeof slug).toBe('string');
    expect(slug).toMatch(/^joseph-[0-9a-z]{4}-[0-9a-z]{4}$/);
    // The slug's decorative name is cosmetic — it decodes back to the public_id.
    expect(extractPublicIdFromSlug(String(slug))).toBe(created['public_id']);
  });

  it('resolves by the display slug, a bare id (any case), and rejects garbage', async () => {
    const created = (await service.addPerson(
      { first_name: 'Amira', last_name: 'Hassan', household_id: householdId } as never,
      auth,
    )) as Record<string, unknown>;
    const id = String(created['id']);
    const publicId = String(created['public_id']);
    const slug = String(created['slug']);

    // (a) full display slug (what the browser shows)
    const bySlug = await controller.getByPublicId(extractPublicIdFromSlug(slug) ?? '', auth);
    expect(String((bySlug as Record<string, unknown>)['id'])).toBe(id);

    // (b) bare canonical id
    const byBare = await controller.getByPublicId(publicId, auth);
    expect(String((byBare as Record<string, unknown>)['id'])).toBe(id);

    // (c) bare lowercase / hyphen-split id — normalized on the backend
    const split = `${publicId.slice(0, 4)}-${publicId.slice(4)}`.toLowerCase();
    const byLower = await controller.getByPublicId(split, auth);
    expect(String((byLower as Record<string, unknown>)['id'])).toBe(id);

    // (d) a malformed segment resolves to nothing
    expect(await controller.getByPublicId('not-an-id', auth)).toBeUndefined();
  });

  it('still resolves an old numeric-id deep link (/people/123)', async () => {
    const created = (await service.addPerson(
      { first_name: 'Numeric', last_name: 'Link', household_id: householdId } as never,
      auth,
    )) as Record<string, unknown>;
    const id = String(created['id']);
    // The resolver passes a numeric segment straight through; the detail view
    // then loads by id. Prove that id load works against the real DB.
    const byId = (await controller.getOneById({ tenant_id: tenantId, id })) as Record<string, unknown> | undefined;
    expect(byId).toBeDefined();
    expect(String(byId?.['id'])).toBe(id);
  });

  it('backfills public_id + slug for bulk-inserted persons (CSV import path)', async () => {
    // Simulate a bulk insert that never set public_id.
    await db
      .insertInto('persons')
      .values([
        {
          tenant_id: tenantId,
          campaign_id: await currentCampaign(db, tenantId),
          household_id: householdId,
          first_name: 'Bulk',
          last_name: 'One',
          createdby_id: userId,
          updatedby_id: userId,
        },
        {
          tenant_id: tenantId,
          campaign_id: await currentCampaign(db, tenantId),
          household_id: householdId,
          first_name: 'Bulk',
          last_name: 'Two',
          createdby_id: userId,
          updatedby_id: userId,
        },
      ])
      .execute();

    const updated = await backfillPersonPublicIds(db, tenantId);
    expect(updated).toBeGreaterThanOrEqual(2);

    const rows = await db
      .selectFrom('persons')
      .select(['public_id', 'slug'])
      .where('tenant_id', '=', tenantId)
      .where('public_id', 'is not', null)
      .execute();
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const ids = new Set<string>();
    for (const row of rows) {
      expect(isCanonicalPublicId(row.public_id)).toBe(true);
      expect(extractPublicIdFromSlug(String(row.slug))).toBe(row.public_id);
      ids.add(String(row.public_id));
    }
    expect(ids.size).toBe(rows.length); // all unique within the tenant
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function currentCampaign(db: any, tenantId: string): Promise<string> {
  const row = await db.selectFrom('campaigns').select('id').where('tenant_id', '=', tenantId).executeTakeFirstOrThrow();
  return String(row.id);
}
