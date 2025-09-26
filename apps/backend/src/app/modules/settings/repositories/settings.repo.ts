/**
 * Repository for application settings stored per tenant.
 */
import { Insertable, OperandValueExpressionOrList, sql } from 'kysely';

import { BaseRepository } from '../../../lib/base.repo';
import { Models } from 'common/src/lib/kysely.models';

/**
 * Repository for interacting with the `settings` table.
 */
export class SettingsRepo extends BaseRepository<'settings'> {
  /**
   * Creates a repository instance for the `settings` table.
   */
  constructor() {
    super('settings');
  }

  /**
   * Retrieve the value stored for a given key and tenant.
   *
   * @param input - Tenant identifier and key to lookup.
   * @returns The associated value or `0` if the key is not found.
   */
  public async getByKey(input: { tenant_id: string; key: string }) {
    const tenant = input.tenant_id as OperandValueExpressionOrList<Models, 'settings', 'tenant_id'>;

    return this.getSelect().selectAll().where('tenant_id', '=', tenant).where('key', '=', input.key).executeTakeFirst();
  }

  public async getAllForTenant(tenant_id: string) {
    const tenant = tenant_id as OperandValueExpressionOrList<Models, 'settings', 'tenant_id'>;

    return this.getSelect().select(['key', 'value', 'updated_at']).where('tenant_id', '=', tenant).execute();
  }

  public async upsertMany(input: {
    tenant_id: string;
    user_id: string;
    entries: { key: string; value: Models['settings']['value'] }[];
  }) {
    if (!input.entries.length) return [] as Models['settings'][];

    const rows = input.entries.map((entry) => ({
      tenant_id: input.tenant_id,
      key: entry.key,
      value: entry.value,
      createdby_id: input.user_id,
      updatedby_id: input.user_id,
    }));

    return this.getInsert()
      .values(rows as Insertable<Models['settings']>[])
      .onConflict((oc) =>
        oc
          .columns(['tenant_id', 'key'])
          .doUpdateSet({
            value: (eb) => eb.ref('excluded.value'),
            updatedby_id: (eb) => eb.ref('excluded.updatedby_id'),
            updated_at: sql`now()`,
          }),
      )
      .returningAll()
      .execute();
  }
}
