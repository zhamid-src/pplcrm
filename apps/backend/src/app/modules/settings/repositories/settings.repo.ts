import type { Insertable, OperandValueExpressionOrList } from 'kysely';
import { sql } from 'kysely';

import { BaseRepository } from '../../../lib/base.repo';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class SettingsRepo extends BaseRepository<'settings'> {
  constructor() {
    super('settings');
  }

  public async getByKey(input: { tenant_id: string; key: string }) {
    const tenant = input.tenant_id as OperandValueExpressionOrList<Models, 'settings', 'tenant_id'>;

    return this.getSelect().selectAll().where('tenant_id', '=', tenant).where('key', '=', input.key).executeTakeFirst();
  }

  public async getAllForTenant(tenant_id: string) {
    const tenant = tenant_id as OperandValueExpressionOrList<Models, 'settings', 'tenant_id'>;

    return this.getSelect().select(['key', 'value', 'updated_at']).where('tenant_id', '=', tenant).execute();
  }

  public async upsertMany(input: { tenant_id: string; user_id: string; entries: { key: string; value: unknown }[] }) {
    if (!input.entries.length) return [] as Models['settings'][];

    const rows = input.entries.map((entry) => ({
      tenant_id: input.tenant_id,
      key: entry.key,
      value: JSON.stringify(entry.value),
      createdby_id: input.user_id,
      updatedby_id: input.user_id,
    }));

    return this.getInsert()
      .values(rows as Insertable<Models['settings']>[])
      .onConflict((oc) =>
        oc.columns(['tenant_id', 'key']).doUpdateSet({
          value: (eb) => eb.ref('excluded.value'),
          updatedby_id: (eb) => eb.ref('excluded.updatedby_id'),
          updated_at: sql`now()`,
        }),
      )
      .returningAll()
      .execute();
  }
}
