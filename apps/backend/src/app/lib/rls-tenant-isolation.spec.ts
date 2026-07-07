import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BaseRepository } from './base.repo';
import { currentTenantId, runWithTenant } from './tenant-context';

/**
 * S-1 (schema review 2026-07-06 §6): proves the row-level-security backstop is
 * live and bound to the async tenant context.
 *
 * These queries deliberately go through `BaseRepository.dbInstance` *without* an
 * app-level `.where('tenant_id', …)` filter — so the only thing that can scope
 * them is the Postgres RLS policy driven by the `app.tenant_id` GUC, which the
 * runtime pool's `onReserveConnection` hook sets from `runWithTenant`. If RLS
 * were off (or the hook were broken) the "scoped" reads below would see the
 * other tenant's rows and the assertions would fail.
 *
 * The spec seeds its OWN two tenants and asserts isolation between them, rather
 * than depending on ambient rows in the shared database — so it is deterministic
 * on a freshly-truncated test DB and robust to other specs writing concurrently.
 * Seeding inserts run with no tenant context (empty `app.tenant_id`), which the
 * policy treats as "allow", so the rows land under RLS without a scoped session.
 */
const rand = (): string => String(Math.floor(Math.random() * 100000000) + 10000000);
const db = BaseRepository.dbInstance;

const A_PERSONS = 2;
const B_PERSONS = 3;

async function seedTenantWithPersons(personCount: number): Promise<string> {
  const tenantId = rand();
  const userId = rand();
  const campaignId = rand();
  const householdId = rand();

  await db.insertInto('tenants').values({ id: tenantId, name: 'RLS Test Tenant' }).execute();
  await db
    .insertInto('authusers')
    .values({
      id: userId,
      tenant_id: tenantId,
      email: `rls-${userId}@example.com`,
      password: 'password',
      first_name: 'Rls',
      last_name: 'Test',
      verified: true,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();
  await db.updateTable('tenants').set({ admin_id: userId, createdby_id: userId }).where('id', '=', tenantId).execute();
  await db
    .insertInto('campaigns')
    .values({
      id: campaignId,
      tenant_id: tenantId,
      admin_id: userId,
      name: 'RLS Campaign',
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

  for (let i = 0; i < personCount; i++) {
    await db
      .insertInto('persons')
      .values({
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: `Person${i}`,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();
  }

  return tenantId;
}

async function purgeTenant(tenantId: string): Promise<void> {
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('RLS tenant isolation', () => {
  let tenantA = '';
  let tenantB = '';

  beforeAll(async () => {
    tenantA = await seedTenantWithPersons(A_PERSONS);
    tenantB = await seedTenantWithPersons(B_PERSONS);
  });

  afterAll(async () => {
    if (tenantA) await purgeTenant(tenantA);
    if (tenantB) await purgeTenant(tenantB);
  });

  async function scopedPersonTenantIds(tenantId: string): Promise<string[]> {
    return runWithTenant(tenantId, async () => {
      const rows = await db.selectFrom('persons').select('tenant_id').execute();
      return rows.map((r) => String(r.tenant_id));
    });
  }

  async function countPersonsUnfiltered(): Promise<number> {
    const row = await db
      .selectFrom('persons')
      .select(({ fn }) => fn.countAll<number>().as('c'))
      .executeTakeFirst();
    return Number(row?.c ?? 0);
  }

  it('leaves the tenant context empty by default', () => {
    expect(currentTenantId()).toBe('');
  });

  it('with no tenant context, an unscoped read sees both seeded tenants', async () => {
    const rows = await db.selectFrom('persons').select('tenant_id').distinct().execute();
    const tenantIds = new Set(rows.map((r) => String(r.tenant_id)));
    expect(tenantIds.has(tenantA)).toBe(true);
    expect(tenantIds.has(tenantB)).toBe(true);
  });

  it('scopes an unfiltered read to exactly the bound tenant', async () => {
    const aIds = await scopedPersonTenantIds(tenantA);
    expect(aIds.length).toBe(A_PERSONS);
    expect(aIds.every((id) => id === tenantA)).toBe(true);

    const bIds = await scopedPersonTenantIds(tenantB);
    expect(bIds.length).toBe(B_PERSONS);
    expect(bIds.every((id) => id === tenantB)).toBe(true);
  });

  it('hides other tenants: a scoped read never returns another tenant’s rows', async () => {
    const aIds = await scopedPersonTenantIds(tenantA);
    expect(aIds.includes(tenantB)).toBe(false);

    // Scoped count is strictly less than the unscoped total, which includes at
    // least tenant B's rows on top of tenant A's.
    const scopedA = aIds.length;
    const total = await countPersonsUnfiltered();
    expect(scopedA).toBeLessThan(total);
  });

  it('restores the empty context after runWithTenant resolves', async () => {
    await runWithTenant('101', async () => {
      expect(currentTenantId()).toBe('101');
    });
    expect(currentTenantId()).toBe('');
  });
});
