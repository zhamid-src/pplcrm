import { OperandValueExpressionOrList } from 'kysely';

import { BaseRepository } from '../base.repo';
import { Models } from 'common/src/lib/kysely.models';

/**
 * Repository for interacting with the `profiles` table.
 */
export class SettingsRepo extends BaseRepository<'settings'> {
  constructor() {
    super('settings');
  }

  public async getByKey(input: { tenant_id: string; key: string }) {
    const row = await this.getSelect()
      .selectAll()
      .where(
        'tenant_id',
        '=',
        input.tenant_id as unknown as OperandValueExpressionOrList<Models, 'settings', 'tenant_id'>,
      )
      .where('key', '=', input.key)
      .executeTakeFirst();

    return row?.value || 0;
  }
}
