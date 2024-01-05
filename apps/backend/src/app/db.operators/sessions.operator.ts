import { UpdateResult } from "kysely";
import {
  GetOperandType,
  TableType,
} from "../../../../../common/src/lib/kysely.models";
import { BaseOperator } from "./base.operator";

export class SessionsOperator extends BaseOperator<TableType.sessions> {
  constructor() {
    super(TableType.sessions);
  }

  /**
   * Delete the session by the given session id
   * @param session_id
   * @returns
   */
  public deleteBySessionId(session_id: string) {
    return this.deleteFrom().where("session_id", "=", session_id).execute();
  }

  /**
   * Get the session by the given session id
   * @param user_id
   * @returns
   */
  public getOneByAuthUserId(
    user_id: GetOperandType<TableType.sessions, "select", "user_id">,
  ) {
    if (!user_id) return Promise.resolve(undefined);
    return this.selectFrom().where("user_id", "=", user_id).executeTakeFirst();
  }

  /**
   * Update the refresh token given the existing refresh token
   * @param user_id
   * @param refresh_token
   * @returns
   */
  public updateRefreshToken(
    user_id: GetOperandType<TableType.sessions, "update", "user_id">,
    refresh_token: string,
  ): Promise<UpdateResult> {
    if (!user_id) return Promise.resolve({ numUpdatedRows: BigInt(0) });
    return this.updateTable()
      .set({ refresh_token })
      .where("user_id", "=", user_id)
      .executeTakeFirst();
  }
}
