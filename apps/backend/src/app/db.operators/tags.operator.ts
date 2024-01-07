import { TableType } from '../../../../../common/src/lib/kysely.models';
import { BaseOperator, QueryParams } from './base.operator';

export class TagsOperator extends BaseOperator<TableType.tags> {
  constructor() {
    super(TableType.tags);
  }

  public override findOne(param: string | bigint, options?: QueryParams<TableType.tags>) {
    if (typeof param === 'bigint') {
      return super.findOne(param, options);
    } else if (typeof param === 'string') {
      return this.getSelect().where('name', '=', param).executeTakeFirst();
    } else {
      throw Error('Invalid param type');
    }
  }
}
