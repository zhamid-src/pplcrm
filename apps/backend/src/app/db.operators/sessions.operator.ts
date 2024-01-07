import { UpdateResult } from 'kysely';
import { GetOperandType, TableType } from '../../../../../common/src/lib/kysely.models';
import { BaseOperator } from './base.operator';

export class SessionsOperator extends BaseOperator<TableType.sessions> {
  constructor() {
    super(TableType.sessions);
  }

  public deleteBySessionId(session_id: string) {
    return this.getDelete().where('session_id', '=', session_id).execute();
  }

  public findOneByAuthUserId(user_id: GetOperandType<TableType.sessions, 'select', 'user_id'>) {
    if (!user_id) return Promise.resolve(undefined);
    return this.getSelect().where('user_id', '=', user_id).executeTakeFirst();
  }

  public updateRefreshToken(
    user_id: GetOperandType<TableType.sessions, 'update', 'user_id'>,
    refresh_token: string,
  ): Promise<UpdateResult> {
    if (!user_id) return Promise.resolve({ numUpdatedRows: BigInt(0) });
    return this.getUpdate()
      .set({ refresh_token })
      .where('user_id', '=', user_id)
      .executeTakeFirst();
  }
}
