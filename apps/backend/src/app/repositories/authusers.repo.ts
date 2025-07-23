import { Transaction, UpdateResult, sql } from 'kysely';
import { GetOperandType, Models } from '../../../../../common/src/lib/kysely.models';
import { BaseRepository, QueryParams } from './base.repo';

type SelectEmailType = GetOperandType<'authusers', 'select', 'email'>;

/**
 * Repository for managing operations on the `authusers` table.
 * Handles authentication user logic like email lookup, password reset, etc.
 */
export class AuthUsersRepo extends BaseRepository<'authusers'> {
  constructor() {
    super('authusers');
  }

  /**
   * Generates a new password reset code and timestamp for a user.
   *
   * @param id - The user's ID.
   * @param trx - Optional transaction context.
   * @returns The newly generated reset code.
   */
  public addPasswordResetCode(id: string, trx?: Transaction<Models>) {
    return this.getUpdate(trx)
      .set({
        password_reset_code: sql<string>`gen_random_uuid()`,
        password_reset_code_created_at: sql`now()`,
      })
      .where('id', '=', id)
      .returning(['password_reset_code'])
      .executeTakeFirst();
  }

  /**
   * Checks whether a user with the given email exists.
   *
   * @param email - Email address to check.
   * @returns True if the user exists, otherwise false.
   */
  public existsByEmail(email: string): Promise<boolean> {
    return this.exists({ key: email, column: 'email' });
  }

  /**
   * Retrieves a user by their email.
   *
   * @param email - The user's email.
   * @param options - Optional query parameters (column selection, etc).
   * @param trx - Optional transaction context.
   * @returns The matching user record, or undefined.
   */
  public getByEmail(email: SelectEmailType, options?: QueryParams<'authusers'>, trx?: Transaction<Models>) {
    return this.getSelectWithColumns(options, trx).where('email', '=', email).executeTakeFirst();
  }

  /**
   * Returns the number of users that match the given email.
   *
   * @param email - Email address to count by.
   * @returns Number of users with the email.
   */
  public async getCountByEmail(email: SelectEmailType): Promise<number> {
    const { count } = (await this.getSelect()
      .select(sql<string>`count(*)`.as('count'))
      .where('email', '=', email)
      .executeTakeFirst()) || { count: '0' };

    return parseInt(count);
  }

  /**
   * Gets the timestamp when a given password reset code was generated.
   *
   * @param code - The password reset code.
   * @param trx - Optional transaction context.
   * @returns Object with `password_reset_code_created_at` field.
   */
  public getPasswordResetCodeTime(code: string, trx?: Transaction<Models>) {
    const codeColumn = 'password_reset_code';

    const options = {
      columns: ['password_reset_code_created_at'] as (keyof Models['authusers'])[],
    };

    return this.getSelectWithColumns(options, trx).where(codeColumn, '=', code).executeTakeFirstOrThrow();
  }

  /**
   * Updates the password for a user using a valid password reset code.
   * Clears the reset code and timestamp upon success.
   *
   * @param password - New hashed password.
   * @param code - Password reset code.
   * @param trx - Optional transaction context.
   * @returns Result of the update operation.
   */
  public updatePassword(password: string, code: string, trx?: Transaction<Models>) {
    return this.getUpdate(trx)
      .set({
        password,
        password_reset_code: null,
        password_reset_code_created_at: null,
      })
      .where('password_reset_code', '=', code)
      .executeTakeFirst() as unknown as UpdateResult;
  }
}
