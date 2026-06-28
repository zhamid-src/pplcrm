import { BaseRepository } from '../../../lib/base.repo';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import type { Transaction } from 'kysely';

export class MapHouseholdsTagsRepo extends BaseRepository<'map_households_tags'> {
  constructor() {
    super('map_households_tags');
  }

  public async deleteMapping(tenant_id: string, household_id: string, tag_id: string, trx?: Transaction<Models>) {
    const res = await this.getDelete(trx)
      .where('tenant_id', '=', tenant_id)
      .where('household_id', '=', household_id)
      .where('tag_id', '=', tag_id)
      .executeTakeFirst();
    return Number(res?.numDeletedRows ?? 0) > 0;
  }

  public async deleteByHouseholdIds(input: { tenant_id: string; household_ids: string[] }, trx?: Transaction<Models>) {
    if (!input.household_ids.length) return 0;
    const res = await this.getDelete(trx)
      .where('tenant_id', '=', input.tenant_id)
      .where('household_id', 'in', input.household_ids)
      .executeTakeFirst();
    return Number(res?.numDeletedRows ?? 0);
  }
}
