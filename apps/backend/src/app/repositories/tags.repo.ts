import { Models } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
import { BaseRepository } from './base.repo';

export class TagsRepo extends BaseRepository<'tags'> {
  constructor() {
    super('tags');
  }

  public getIdByName(tenant_id: string, name: string, trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .select('id')
      .where('name', '=', name)
      .where('tenant_id', '=', tenant_id)
      .executeTakeFirst();
  }
}
