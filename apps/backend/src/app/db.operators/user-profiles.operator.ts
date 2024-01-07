import { TableType } from '../../../../../common/src/lib/kysely.models';
import { BaseOperator, QueryParams } from './base.operator';

export class UserPofilesOperator extends BaseOperator<TableType.profiles> {
  constructor() {
    super(TableType.profiles);
  }

  public getOneByAuthId(auth_id: bigint, options?: QueryParams<TableType.profiles>) {
    return this.getSelectWithColumns(options).where('auth_id', '=', auth_id).executeTakeFirst();
  }
}
