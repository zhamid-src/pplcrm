import { describe, expect, it } from 'vitest';

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
 * were off (or the hook were broken) the "scoped" reads below would see every
 * tenant's rows and the assertions would fail.
 *
 * Runs against the shared local Postgres like the other backend specs; it only
 * reads seed data and never writes, so there is nothing to clean up.
 */
describe('RLS tenant isolation', () => {
  // Enumerate the tenants that actually have persons, unscoped (no context).
  async function tenantsWithPersons(): Promise<string[]> {
    const rows = await BaseRepository.dbInstance
      .selectFrom('persons')
      .select('tenant_id')
      .distinct()
      .orderBy('tenant_id')
      .execute();
    return rows.map((r) => String(r.tenant_id));
  }

  async function countPersonsUnfiltered(): Promise<number> {
    const row = await BaseRepository.dbInstance
      .selectFrom('persons')
      .select(({ fn }) => fn.countAll<number>().as('c'))
      .executeTakeFirst();
    return Number(row?.c ?? 0);
  }

  async function personTenantIds(): Promise<string[]> {
    const rows = await BaseRepository.dbInstance.selectFrom('persons').select('tenant_id').execute();
    return rows.map((r) => String(r.tenant_id));
  }

  it('leaves the tenant context empty by default', () => {
    expect(currentTenantId()).toBe('');
  });

  it('with no tenant context, an unscoped read sees every tenant', async () => {
    const tenants = await tenantsWithPersons();
    // Precondition for this suite to be meaningful: seed data spans >1 tenant.
    expect(tenants.length).toBeGreaterThan(1);

    const total = await countPersonsUnfiltered();
    // Sum of each tenant's scoped count must equal the unscoped total.
    let sum = 0;
    for (const t of tenants) {
      const n = await runWithTenant(t, () => countPersonsUnfiltered());
      sum += n;
    }
    expect(sum).toBe(total);
  });

  it('scopes an unfiltered read to exactly the bound tenant', async () => {
    const tenants = await tenantsWithPersons();
    for (const t of tenants) {
      const ids = await runWithTenant(t, () => personTenantIds());
      expect(ids.length).toBeGreaterThan(0);
      // RLS is the ONLY scope here — every visible row must belong to `t`.
      expect(ids.every((id) => id === t)).toBe(true);
    }
  });

  it('hides other tenants: a scoped read returns fewer rows than the unscoped total', async () => {
    const tenants = await tenantsWithPersons();
    const total = await countPersonsUnfiltered();
    const first = tenants[0];
    expect(first).toBeDefined();
    const scoped = await runWithTenant(first as string, () => countPersonsUnfiltered());
    expect(scoped).toBeLessThan(total);
  });

  it('restores the empty context after runWithTenant resolves', async () => {
    await runWithTenant('101', async () => {
      expect(currentTenantId()).toBe('101');
    });
    expect(currentTenantId()).toBe('');
  });
});
