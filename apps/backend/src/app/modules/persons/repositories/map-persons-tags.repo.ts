import { BaseRepository } from '../../../lib/base.repo';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import type { Transaction } from 'kysely';

export class MapPersonsTagRepo extends BaseRepository<'map_peoples_tags'> {
  constructor() {
    super('map_peoples_tags');
  }

  public async hasMapping(input: { tenant_id: string; person_id: string; tag_id: string }, trx?: Transaction<Models>) {
    const payload = await this.getSelect(trx)
      .select('person_id')
      .where('person_id', '=', input.person_id)
      .where('tag_id', '=', input.tag_id)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();
    return !!payload;
  }

  public async deleteMapping(
    input: { tenant_id: string; person_id: string; tag_id: string },
    trx?: Transaction<Models>,
  ) {
    const res = await this.getDelete(trx)
      .where('tenant_id', '=', input.tenant_id)
      .where('person_id', '=', input.person_id)
      .where('tag_id', '=', input.tag_id)
      .executeTakeFirst();
    return Number(res?.numDeletedRows ?? 0) > 0;
  }

  public async deleteByPersonIds(input: { tenant_id: string; person_ids: string[] }, trx?: Transaction<Models>) {
    if (!input.person_ids.length) return 0;
    const res = await this.getDelete(trx)
      .where('tenant_id', '=', input.tenant_id as any)
      .where('person_id', 'in', input.person_ids as any)
      .executeTakeFirst();
    return Number(res?.numDeletedRows ?? 0);
  }
}
