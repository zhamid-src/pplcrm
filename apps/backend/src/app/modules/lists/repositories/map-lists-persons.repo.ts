import { BaseRepository } from '../../../lib/base.repo';
import { Models } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';

/** Repository for the `map_lists_persons` table. */
export class MapListsPersonsRepo extends BaseRepository<'map_lists_persons'> {
  constructor() {
    super('map_lists_persons');
  }

  /** Delete all mappings for the given person IDs within a tenant. */
  public async deleteByPersonIds(input: { tenant_id: string; person_ids: string[] }, trx?: Transaction<Models>) {
    if (!input.person_ids.length) return 0;
    const res = await this.getDelete(trx)
      .where('tenant_id', '=', input.tenant_id as any)
      .where('person_id', 'in', input.person_ids as any)
      .executeTakeFirst();
    return Number(res?.numDeletedRows ?? 0);
  }
}
