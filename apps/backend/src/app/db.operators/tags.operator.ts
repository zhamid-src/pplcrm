import { TableIdType } from 'common/src/lib/kysely.models';
import { BaseOperator, QueryParams } from './base.operator';

export class TagsOperator extends BaseOperator<'tags'> {
  constructor() {
    super('tags');
  }

  public override findOne(
    IdOrName: string | bigint | TableIdType<'tags'>,
    options?: QueryParams<'tags'>,
  ) {
    if (typeof IdOrName === 'bigint') {
      return super.findOne(IdOrName, options);
    } else if (typeof IdOrName === 'string') {
      return this.getSelect().where('name', '=', IdOrName).executeTakeFirst();
    } else {
      throw Error('Invalid param type');
    }
  }
}
