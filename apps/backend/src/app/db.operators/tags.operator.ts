import { Models, TableIdType } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
import { BaseOperator, QueryParams } from './base.operator';

export class TagsOperator extends BaseOperator<'tags'> {
  constructor() {
    super('tags');
  }

  public override findOne(
    IdOrName: string | bigint | TableIdType<'tags'>,
    options?: QueryParams<'tags'>,
    trx?: Transaction<Models>,
  ) {
    if (typeof IdOrName === 'bigint') {
      return super.findOne(IdOrName, options, trx);
    } else if (typeof IdOrName === 'string') {
      return this.getSelect(trx).where('name', '=', IdOrName).executeTakeFirst();
    } else {
      throw Error('Invalid param type');
    }
  }
}
