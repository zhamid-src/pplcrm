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

  public async deleteByUserId(user_id: string, tenant_id: string, trx?: Transaction<Models>) {
    return this.getDelete(trx).where('user_id', '=', user_id).where('tenant_id', '=', tenant_id).executeTakeFirst();
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
