import { SelectExpression, sql } from 'kysely';
import { GetOperandType, Models, TableType } from '../../../../../common/src/lib/kysely.models';
import { BaseOperator, QueryParams } from './base.operator';

type SelectEmailType = GetOperandType<TableType.authusers, 'select', 'email'>;

/**
 * Handles all the authusers table operations.
 */
export class AuthUsersOperator extends BaseOperator<TableType.authusers> {
  constructor() {
    super(TableType.authusers);
  }

  public addPasswordResetCode(id: bigint) {
    return this.getUpdate()
      .set({
        password_reset_code: sql<string>`gen_random_uuid()`,
        password_reset_code_created_at: sql`now()`,
      })
      .where('id', '=', id)
      .returning(['password_reset_code'])
      .executeTakeFirst();
  }

  public findOneByEmail(email: SelectEmailType, options?: QueryParams<TableType.authusers>) {
    return this.getSelectWithColumns(options).where('email', '=', email).executeTakeFirst();
  }

  public async getCountByEmail(email: SelectEmailType): Promise<number> {
    const { count } = (await this.getSelect()
      .select(sql<string>`count(*)`.as('count'))
      .where('email', '=', email)
      .executeTakeFirst()) || { count: '0' };

    return parseInt(count);
  }

  public getPasswordResetCodeTime(code: string) {
    const codeColumn = 'password_reset_code';
    const columns: SelectExpression<Models, TableType.authusers>[] = [
      'password_reset_code_created_at',
    ];
    return this.getSelectWithColumns({ columns })
      .where(codeColumn, '=', code)
      .executeTakeFirstOrThrow();
  }

  public updatePassword(password: string, code: string) {
    return this.getUpdate()
      .set({
        password,
        password_reset_code: null,
        password_reset_code_created_at: null,
      })
      .where('password_reset_code', '=', code)
      .executeTakeFirst();
  }
}
