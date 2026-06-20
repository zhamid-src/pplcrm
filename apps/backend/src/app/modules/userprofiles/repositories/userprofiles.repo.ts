import { Transaction } from 'kysely';

import { BaseRepository, QueryParams } from '../../../lib/base.repo';
import { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class UserProfiles extends BaseRepository<'profiles'> {
  constructor() {
    super('profiles');
  }

  public getOneByAuthId(auth_id: string, options?: QueryParams<'profiles'>, trx?: Transaction<Models>) {
    return this.getSelectWithColumns(options, trx).where('auth_id', '=', auth_id).executeTakeFirst();
  }
}
