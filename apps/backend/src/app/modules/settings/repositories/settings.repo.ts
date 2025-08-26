/**
 * Repository for application settings stored per tenant.
 */
import { OperandValueExpressionOrList } from 'kysely';

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
