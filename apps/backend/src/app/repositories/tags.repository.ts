import { Models, TableIdType } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
import { BaseRepository, QueryParams } from './base.repository';

export class TagsRepository extends BaseRepository<'tags'> {
  constructor() {
    super('tags');
  }

  public override getById(
    IdOrName: string | bigint | TableIdType<'tags'>,
    options?: QueryParams<'tags'>,
    trx?: Transaction<Models>,
  ) {
    if (typeof IdOrName === 'bigint') {
      return super.getById(IdOrName, options, trx);
    } else if (typeof IdOrName === 'string') {
      return this.getSelect(trx).where('name', '=', IdOrName).executeTakeFirst();
    } else {
      throw Error('Invalid param type');
    }
  }
}
