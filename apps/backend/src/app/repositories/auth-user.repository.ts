import { SelectExpression, Transaction, sql } from 'kysely';
import { GetOperandType, Models } from '../../../../../common/src/lib/kysely.models';
import { BaseRepository, QueryParams } from './base.repository';

type SelectEmailType = GetOperandType<'authusers', 'select', 'email'>;

/**
 * Handles all the authusers table operations.
 */
export class AuthUsersRepository extends BaseRepository<'authusers'> {
  constructor() {
    super('authusers');
  }

  public addPasswordResetCode(id: bigint, trx?: Transaction<Models>) {
    return this.getUpdate(trx)
      .set({
        password_reset_code: sql<string>`gen_random_uuid()`,
        password_reset_code_created_at: sql`now()`,
      })
      .where('id', '=', id)
      .returning(['password_reset_code'])
      .executeTakeFirst();
  }

  public findOneByEmail(
    email: SelectEmailType,
    options?: QueryParams<'authusers'>,
    trx?: Transaction<Models>,
  ) {
    return this.getSelectWithColumns(options, trx).where('email', '=', email).executeTakeFirst();
  }

  public async getCountByEmail(email: SelectEmailType): Promise<number> {
    const { count } = (await this.getSelect()
      .select(sql<string>`count(*)`.as('count'))
      .where('email', '=', email)
      .executeTakeFirst()) || { count: '0' };

    return parseInt(count);
  }

  public getPasswordResetCodeTime(code: string, trx?: Transaction<Models>) {
    const codeColumn = 'password_reset_code';
    const columns: SelectExpression<Models, 'authusers'>[] = ['password_reset_code_created_at'];
    return this.getSelectWithColumns({ columns }, trx)
      .where(codeColumn, '=', code)
      .executeTakeFirstOrThrow();
  }

  public updatePassword(password: string, code: string, trx?: Transaction<Models>) {
    return this.getUpdate(trx)
      .set({
        password,
        password_reset_code: null,
        password_reset_code_created_at: null,
      })
      .where('password_reset_code', '=', code)
      .executeTakeFirst();
  }
}
