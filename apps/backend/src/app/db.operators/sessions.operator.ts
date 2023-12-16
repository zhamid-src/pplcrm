import { UpdateResult } from "kysely";
import { GetOperandType, TableType } from "../kysely.models";
import { db } from "../kyselyiit";
import { BaseOperator } from "./base.operator";

export class SessionsOperator extends BaseOperator<TableType.sessions> {
  constructor() {
    super(TableType.sessions);
  }

  public deleteByAuthUserId(
    user_id: GetOperandType<TableType.sessions, "update", "user_id">,
  ) {
    if (!user_id) return Promise.resolve(undefined);

    return db
      .deleteFrom(this.table)
      .where("user_id", "=", user_id)
      .executeTakeFirst();
  }

  public getOneByAuthUserId(
    user_id: GetOperandType<TableType.sessions, "select", "user_id">,
  ) {
    if (!user_id) return Promise.resolve(undefined);

    return db
      .selectFrom(this.table)
      .where("user_id", "=", user_id)
      .executeTakeFirst();
  }

  public updateRefreshToken(
    user_id: GetOperandType<TableType.sessions, "update", "user_id">,
    refresh_token: string,
  ): Promise<UpdateResult> {
    if (!user_id) return Promise.resolve({ numUpdatedRows: BigInt(0) });

    return db
      .updateTable(this.table)
      .set({ refresh_token })
      .where("user_id", "=", user_id)
      .executeTakeFirst();
  }
}
