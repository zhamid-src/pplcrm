import { Models } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
import { BaseRepository } from './base.repo';

export class TagsRepo extends BaseRepository<'tags'> {
  constructor() {
    super('tags');
  }

  public getIdByName(name: string, trx?: Transaction<Models>) {
    return this.getSelect(trx).select('id').where('name', '=', name).executeTakeFirst();
  }
}
