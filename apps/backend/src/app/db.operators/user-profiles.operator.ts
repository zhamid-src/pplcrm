import { BaseOperator, QueryParams } from './base.operator';

export class UserPofilesOperator extends BaseOperator<'profiles'> {
  constructor() {
    super('profiles');
  }

  public getOneByAuthId(auth_id: bigint, options?: QueryParams<'profiles'>) {
    return this.getSelectWithColumns(options).where('auth_id', '=', auth_id).executeTakeFirst();
  }
}
