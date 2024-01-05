import { sql } from "kysely";
import {
  GetOperandType,
  TableType,
} from "../../../../../common/src/lib/kysely.models";
import { BaseOperator, QueryParams } from "./base.operator";

/**
 * Handles all the authusers table operations.
 */
export class AuthUsersOperator extends BaseOperator<TableType.authusers> {
  constructor() {
    super(TableType.authusers);
  }

  /**
   * Add a password reset code to the user
   * @param id
   * @returns the password reset code
   */
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

  /**
   * Get the count of users with the given email. It should always be 0 or 1
   * @param email
   * @returns the number
   */
  public async getCountByEmail(
    email: GetOperandType<TableType.authusers, "select", "email">,
  ): Promise<number> {
    const { count } = (await this.selectFrom()
      .select(sql<string>`count(*)`.as("count"))
      .where("email", "=", email)
      .executeTakeFirst()) || { count: "0" };

    return parseInt(count);
  }

  /**
   * Get the auth user by email
   * @param email
   * @param options - mostly used to restrict columns
   * @returns the auth user
   */
  public getOneByEmail(
    email: GetOperandType<TableType.authusers, "select", "email">,
    options?: QueryParams<TableType.authusers>,
  ) {
    return this.getQuery(options).where("email", "=", email).executeTakeFirst();
  }

  /**
   * Update the password given the password reset code. Fails if the code is
   * wrong
   * @param password
   * @param code
   * @returns
   */
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
