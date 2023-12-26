import { sql } from "kysely";
import {
  GetOperandType,
  TableType,
} from "../../../../../common/src/lib/kysely.models";
import { BaseOperator, QueryParams } from "./base.operator";

export class AuthUsersOperator extends BaseOperator<TableType.authusers> {
  constructor() {
    super(TableType.authusers);
  }

  public addPasswordResetCode(id: bigint) {
    return this.updateTable()
      .set({
        password_reset_code: sql<string>`gen_random_uuid()`,
        password_reset_code_created_at: sql`now()`,
      })
      .where("id", "=", id)
      .returning(["password_reset_code"])
      .executeTakeFirst();
  }

  public async getCountByEmail(
    email: GetOperandType<TableType.authusers, "select", "email">,
  ): Promise<number> {
    const { count } = (await this.selectFrom()
      .select(sql<string>`count(*)`.as("count"))
      .where("email", "=", email)
      .executeTakeFirst()) || { count: "0" };

    return parseInt(count);
  }

  public getOneByEmail(
    email: GetOperandType<TableType.authusers, "select", "email">,
    options?: QueryParams<TableType.authusers>,
  ) {
    return this.getQuery(options).where("email", "=", email).executeTakeFirst();
  }

  public updatePassword(password: string, code: string) {
    return this.updateTable()
      .set({
        password,
        password_reset_code: null,
        password_reset_code_created_at: null,
      })
      .where("password_reset_code", "=", code)
      .executeTakeFirst();
  }
}
