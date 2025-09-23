/**
 * Data access layer for authentication user records.
 */
import { SelectQueryBuilder, Transaction, UpdateResult, sql } from 'kysely';

import { GetOperandType, Models } from '../../../../../../../common/src/lib/kysely.models';
import { BaseRepository, JoinedQueryParams, QueryParams } from '../../../lib/base.repo';

/**
 * Repository for managing operations on the `authusers` table.
 * Handles authentication user logic like email lookup, password reset, etc.
 */
export class AuthUsersRepo extends BaseRepository<'authusers'> {
  /**
   * Creates a repository instance for the `authusers` table.
   */
  constructor() {
    super('authusers');
  }

  public override async getAllWithCounts(
    input: { tenant_id: string; options?: QueryParams<'authusers'> },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams = (input.options as JoinedQueryParams) ?? {};
    const tenantId = input.tenant_id;
    const searchStr = typeof options.searchStr === 'string' ? options.searchStr.trim().toLowerCase() : '';
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;

    const startRow = typeof options.startRow === 'number' && options.startRow >= 0 ? options.startRow : 0;
    const endRowCandidate = typeof options.endRow === 'number' && options.endRow > startRow ? options.endRow : startRow + 50;
    const pageSize = Math.max(1, endRowCandidate - startRow);

    const applyFilters = <QB extends SelectQueryBuilder<Models, any, any>>(qb: QB) =>
      qb
        .leftJoin('profiles', 'profiles.auth_id', 'authusers.id')
        .where('authusers.tenant_id', '=', tenantId)
        .$if(!!searchStr, (builder) => {
          const text = `%${searchStr}%`;
          return builder.where(
            sql`(
              LOWER(authusers.email) LIKE ${text} OR
              LOWER(authusers.first_name) LIKE ${text} OR
              LOWER(COALESCE(authusers.last_name, '')) LIKE ${text} OR
              LOWER(COALESCE(profiles.last_name, '')) LIKE ${text}
            )` as any,
          );
        })
        .$if(filterModel['verified'] !== undefined && filterModel['verified'] !== null, (builder) => {
          const raw = filterModel['verified'];
          const boolVal =
            typeof raw === 'boolean'
              ? raw
              : typeof raw?.value === 'boolean'
                ? raw.value
                : String(raw?.value ?? raw ?? '').toLowerCase() === 'true';
          return builder.where('authusers.verified', '=', boolVal as any);
        })
        .$if(filterModel['role']?.value || typeof filterModel['role'] === 'string', (builder) => {
          const raw = filterModel['role']?.value ?? filterModel['role'];
          const value = String(raw ?? '').trim();
          if (!value) return builder;
          return builder.where('authusers.role', '=', value as any);
        });

    const countRow = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count(sql`DISTINCT authusers.id`).as('total')])
      .executeTakeFirst();
    const count = Number(countRow?.['total'] ?? 0);

    const sorts = options.sortModel ?? [];

    const rowsRaw = await applyFilters(this.getSelect(trx))
      .select(() => [
        'authusers.id',
        'authusers.email',
        'authusers.first_name',
        'authusers.last_name',
        'authusers.role',
        'authusers.verified',
        'authusers.created_at',
        'authusers.updated_at',
        sql<string>`COALESCE(authusers.last_name, profiles.last_name)`.as('effective_last_name'),
        sql<string>`profiles.last_name`.as('profile_last_name'),
      ])
      .$if(sorts.length > 0, (qb) => {
        return sorts.reduce((acc, sort) => {
          const dir = sort.sort;
          switch (sort.colId) {
            case 'email':
              return acc.orderBy('authusers.email', dir);
            case 'first_name':
              return acc.orderBy('authusers.first_name', dir);
            case 'last_name':
              return acc.orderBy(sql`COALESCE(authusers.last_name, profiles.last_name)` as any, dir);
            case 'role':
              return acc.orderBy('authusers.role', dir);
            case 'verified':
              return acc.orderBy('authusers.verified', dir);
            case 'created_at':
              return acc.orderBy('authusers.created_at', dir);
            case 'updated_at':
              return acc.orderBy('authusers.updated_at', dir);
            default:
              return acc.orderBy(sort.colId as any, dir);
          }
        }, qb);
      })
      .offset(startRow)
      .limit(pageSize)
      .execute();

    const rows = rowsRaw.map((row: any) => ({
      id: row.id != null ? String(row.id) : undefined,
      email: row.email ?? '',
      first_name: row.first_name ?? '',
      last_name: row.effective_last_name ?? row.profile_last_name ?? row.last_name ?? '',
      role: row.role != null ? String(row.role) : null,
      verified: this.toBoolean(row.verified),
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    }));

    return { rows, count };
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
    return false;
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

type SelectEmailType = GetOperandType<'authusers', 'select', 'email'>;
