import { Models } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
import { BaseRepository, QueryParams } from './base.repository';

export class UserPofiles extends BaseRepository<'profiles'> {
  constructor() {
    super('profiles');
  }

  public getOneByAuthId(
    auth_id: bigint,
    options?: QueryParams<'profiles'>,
    trx?: Transaction<Models>,
  ) {
    return this.getSelectWithColumns(options, trx)
      .where('auth_id', '=', auth_id)
      .executeTakeFirst();
  }
}
