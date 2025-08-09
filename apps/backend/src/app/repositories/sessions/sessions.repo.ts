import { Transaction } from 'kysely';

import { GetOperandType, Models } from '../../../../../../common/src/lib/kysely.models';
import { BaseRepository } from '../base.repo';

/**
 * Repository for managing user sessions in the `sessions` table.
 */
export class SessionsRepo extends BaseRepository<'sessions'> {
  constructor() {
    super('sessions');
  }

  /**
   * Delete a session by its session ID.
   *
   * @param session_id - The session ID to delete
   * @param trx - Optional Kysely transaction
   * @returns A promise resolving to the deletion result
   */
  public deleteBySessionId(session_id: string, trx?: Transaction<Models>) {
    return this.getDelete(trx).where('session_id', '=', session_id).execute();
  }

  /**
   * Get a single session row by the associated user ID.
   *
   * @param user_id - The user ID whose session to retrieve
   * @param trx - Optional Kysely transaction
   * @returns A promise resolving to the session row or `undefined`
   */
  public getOneByAuthUserId(user_id: GetOperandType<'sessions', 'select', 'user_id'>, trx?: Transaction<Models>) {
    if (!user_id) return Promise.resolve(undefined);
    return this.getSelect(trx).where('user_id', '=', user_id).executeTakeFirst();
  }

  /**
   * Update the refresh token for the given user ID.
   *
   * @param user_id - The user ID whose token to update
   * @param refresh_token - The new refresh token to set
   * @param trx - Optional Kysely transaction
   * @returns A promise resolving to the update result
   */
  public updateRefreshToken(
    user_id: GetOperandType<'sessions', 'update', 'user_id'>,
    refresh_token: string,
    trx?: Transaction<Models>,
  ) {
    if (!user_id) return Promise.resolve({ numUpdatedRows: BigInt(0) });

    return this.getUpdate(trx).set({ refresh_token }).where('user_id', '=', user_id).executeTakeFirst();
  }
}
