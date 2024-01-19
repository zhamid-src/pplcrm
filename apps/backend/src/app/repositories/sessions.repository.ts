import { Transaction, UpdateResult } from 'kysely';
import { GetOperandType, Models } from '../../../../../common/src/lib/kysely.models';
import { BaseRepository } from './base.repository';

export class SessionsRepository extends BaseRepository<'sessions'> {
  constructor() {
    super('sessions');
  }

  public deleteBySessionId(session_id: string, trx?: Transaction<Models>) {
    return this.getDelete(trx).where('session_id', '=', session_id).execute();
  }

  public getOneByAuthUserId(
    user_id: GetOperandType<'sessions', 'select', 'user_id'>,
    trx?: Transaction<Models>,
  ) {
    if (!user_id) return Promise.resolve(undefined);
    return this.getSelect(trx).where('user_id', '=', user_id).executeTakeFirst();
  }

  public updateRefreshToken(
    user_id: GetOperandType<'sessions', 'update', 'user_id'>,
    refresh_token: string,
    trx?: Transaction<Models>,
  ): Promise<UpdateResult> {
    if (!user_id) return Promise.resolve({ numUpdatedRows: BigInt(0) });
    return this.getUpdate(trx)
      .set({ refresh_token })
      .where('user_id', '=', user_id)
      .executeTakeFirst();
  }
}
