import { sql } from "kysely";
import { GetOperandType, TableType } from "../kysely.models";
import { db } from "../kyselyiit";
import { BaseOperator, QueryParams } from "./base.operator";

export class AuthUsersOperator extends BaseOperator<TableType.authusers> {
  constructor() {
    super(TableType.authusers);
  }

  public async getCountByEmail(
    email: GetOperandType<TableType.authusers, "select", "email">,
  ): Promise<number> {
    const { count } = await (db
      .selectFrom(this.table)
      .select(sql<string>`count(*)`.as("count"))
      .where("email", "=", email)
      .executeTakeFirst() as unknown as {
      count: number;
    });
    return count;
  }

  public getOneByEmail(
    email: GetOperandType<TableType.authusers, "select", "email">,
    options?: QueryParams<TableType.authusers>,
  ) {
    return this.getQuery(options).where("email", "=", email).executeTakeFirst();
  }

  public updatePassword(password: string, code: string) {
    return db
      .updateTable(this.table)
      .set({
        password,
        password_reset_code: null,
        password_reset_code_created_at: null,
      })
      .where("password_reset_code", "=", code)
      .executeTakeFirst();
  }

  public addPasswordResetCode(id: number) {
    return db
      .updateTable(this.table)
      .set({
        password_reset_code: sql<string>`gen_random_uuid()`,
        password_reset_code_created_at: sql`now()`,
      })
      .where("id", "=", id)
      .returning(["password_reset_code"])
      .executeTakeFirst();
  }
}
