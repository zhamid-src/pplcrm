import type { Selectable, Transaction } from 'kysely';

import type { QueryParams } from '../../../lib/base.repo';
import { BaseRepository } from '../../../lib/base.repo';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class UserProfiles extends BaseRepository<'profiles'> {
  constructor() {
    super('profiles');
  }

  public async getOneByAuthId(
    auth_id: string,
    options?: QueryParams<'profiles'>,
    trx?: Transaction<Models>,
  ): Promise<Selectable<Models['profiles']> | undefined> {
    return this.getSelectWithColumns(options, trx).where('auth_id', '=', auth_id).executeTakeFirst() as Promise<
      Selectable<Models['profiles']> | undefined
    >;
  }
}
