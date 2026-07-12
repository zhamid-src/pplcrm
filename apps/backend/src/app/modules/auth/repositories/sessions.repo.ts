import type { Transaction } from 'kysely';

import type { GetOperandType, Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { BaseRepository } from '../../../lib/base.repo';
import { hashToken } from '../../../lib/token-hash';

export class SessionsRepo extends BaseRepository<'sessions'> {
  constructor() {
    super('sessions');
  }

  public async deleteBySessionId(session_id: string, trx?: Transaction<Models>) {
    const result = await this.getDelete(trx).where('session_id', '=', hashToken(session_id)).executeTakeFirst();
    return Number(result?.numDeletedRows ?? 0);
  }

  /** Delete by the already-hashed session_id (as stored in the DB), for callers that hold the hash
   * rather than the plaintext session id (e.g. cookie-based token refresh). */
  public async deleteBySessionHash(session_hash: string, trx?: Transaction<Models>) {
    const result = await this.getDelete(trx).where('session_id', '=', session_hash).executeTakeFirst();
    return Number(result?.numDeletedRows ?? 0);
  }

  public async deleteByUserId(user_id: string, tenant_id: string, trx?: Transaction<Models>) {
    return this.getDelete(trx).where('user_id', '=', user_id).where('tenant_id', '=', tenant_id).executeTakeFirst();
  }

  /** Delete rotated sessions whose refresh-reuse grace window has passed — they can never
   * authenticate again (auth gates only accept status='active', and renew rejects rotated
   * sessions older than the grace window). */
  public async deleteRotatedBefore(user_id: string, tenant_id: string, cutoff: Date, trx?: Transaction<Models>) {
    return this.getDelete(trx)
      .where('user_id', '=', user_id)
      .where('tenant_id', '=', tenant_id)
      .where('status', '=', 'rotated')
      .where('last_used_at', '<', cutoff)
      .executeTakeFirst();
  }

  /** Mark a session as rotated (refresh-token rotation). The row becomes invisible to the auth
   * gates immediately (they filter status='active'), but renewAuthToken still honors its refresh
   * token for a short reuse window so concurrent tabs replaying the same cookie aren't stranded.
   * `last_used_at` is stamped with the rotation time — the grace check reads it. */
  public async markRotatedBySessionHash(session_hash: string, tenant_id: string, trx?: Transaction<Models>) {
    const result = await this.getUpdate(trx)
      .set({ status: 'rotated', last_used_at: new Date() })
      .where('session_id', '=', session_hash)
      .where('tenant_id', '=', tenant_id)
      .where('status', '=', 'active')
      .executeTakeFirst();
    return Number(result?.numUpdatedRows ?? 0);
  }

  public getOneByAuthUserId(user_id: GetOperandType<'sessions', 'select', 'user_id'>, trx?: Transaction<Models>) {
    if (!user_id) return Promise.resolve(undefined);
    return this.getSelect(trx).where('user_id', '=', user_id).executeTakeFirst();
  }

  public updateRefreshToken(
    user_id: GetOperandType<'sessions', 'update', 'user_id'>,
    refresh_token: string,
    trx?: Transaction<Models>,
  ) {
    if (!user_id) return Promise.resolve({ numUpdatedRows: BigInt(0) });

    return this.getUpdate(trx).set({ refresh_token }).where('user_id', '=', user_id).executeTakeFirst();
  }
}
