// tsco:ignore

/**
 * Shared base repository that wraps Kysely and provides common CRUD helpers.
 * Specific repositories for individual tables extend this class.
 */
import { INow } from '@common';

import { promises as fs } from 'fs';
import {
  FileMigrationProvider,
  InsertQueryBuilder,
  InsertResult,
  Kysely,
  Migrator,
  OperandValueExpressionOrList,
  OrderByExpression,
  PostgresDialect,
  QueryResult,
  ReferenceExpression,
  SelectExpression,
  SelectQueryBuilder,
  Transaction,
  UpdateQueryBuilder,
  sql,
} from 'kysely';
import path from 'path';

import {
  Models,
  OperationDataType,
  TypeColumnValue,
  TypeId,
  TypeTableColumns,
  TypeTenantId,
} from '../../../../../common/src/lib/kysely.models';
import { Pool } from 'pg';
import { env } from '../../env';
import { GroupByArg } from 'node_modules/kysely/dist/esm/parser/group-by-parser';

const dialect = new PostgresDialect({
  pool: new Pool(env.db),
});

/**
 * The base operator class that implements regular db functions.
 * Other tables should extend this class. There is generally a
 * one to one mapping between dB table and repository class.
 *
 * @example
 * export class PersonsRepo extends BaseRepository<'persons'> {
 *   constructor() {
 *     super('persons');
 *   }
 * }
 */
export class BaseRepository<T extends keyof Models> {
  private static _db = new Kysely<Models>({ dialect });
  private static _migrationFolder = path.resolve(process.cwd(), 'apps/backend/src/app/_migrations');

  protected readonly table: T;

  /**
   * Static migrator object for running Kysely migrations.
   */
  public static migrator = new Migrator({
    db: BaseRepository._db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: BaseRepository._migrationFolder,
    }),
  });

  /**
   * Creates a repository instance scoped to a specific table.
   *
   * @param tableIn - The table this repository should operate on.
   */
  constructor(tableIn: T) {
    this.table = tableIn;
  }

  /**
   * Insert a single row.
   */
  public async add(input: { row: OperationDataType<T, 'insert'> }, trx?: Transaction<Models>) {
    return this.getInsert(trx).values(input.row).returningAll().executeTakeFirst();
  }

  /**
   * Insert multiple rows.
   */
  public async addMany(input: { rows: OperationDataType<T, 'insert'>[] }, trx?: Transaction<Models>) {
    return this.getInsert(trx).values(input.rows).returningAll().execute();
  }

  /**
   * Insert a row or return an existing one based on conflict column.
   */
  public async addOrGet<K extends keyof Models[T] & string>(
    input: {
      row: OperationDataType<T, 'insert'>;
      onConflictColumn: K;
    },
    trx?: Transaction<Models>,
  ): Promise<Models[T] | undefined> {
    const insertResult = await this.getInsert(trx)
      .values(input.row)
      .onConflict((oc) => oc.columns(['tenant_id', input.onConflictColumn]).doNothing())

      .returningAll()
      .executeTakeFirst();

    if (insertResult) return insertResult as unknown as Models[T];

    const matchValue = input.row[input.onConflictColumn];
    if (matchValue === undefined) {
      throw new Error(`Missing value for conflict column: ${String(input.onConflictColumn)}`);
    }

    const lhs = input.onConflictColumn as ReferenceExpression<Models, T>;
    return this.getSelect(trx).selectAll().where(lhs, '=', matchValue).executeTakeFirst() as unknown as
      | Models[T]
      | undefined;
  }

  /**
   * Count number of rows for the given tenant.
   */
  public async count(
    tenant_id: OperandValueExpressionOrList<Models, T, 'tenant_id'>,
    trx?: Transaction<Models>,
  ): Promise<number> {
    const result = await this.getSelect(trx)
      .select(({ fn }) => [fn.countAll<number>().as('count')])
      .where('tenant_id', '=', tenant_id)
      .executeTakeFirst();
    return result?.count ?? 0;
  }

  /**
   * Delete a single row by ID.
   */
  public async delete(input: { tenant_id: TypeTenantId<T>; id: TypeId<T> }, trx?: Transaction<Models>) {
    return this.deleteMany({ tenant_id: input.tenant_id, ids: [input.id] }, trx);
  }

  /**
   * Delete multiple rows by ID(s).
   */
  public async deleteMany(input: { tenant_id: TypeTenantId<T>; ids: TypeId<T>[] }, trx?: Transaction<Models>) {
    // Convert to numbers if needed
    const numericIds = input.ids;

    const deleteQuery = this.getDelete(trx) as ReturnType<typeof BaseRepository.prototype.getDelete>;
    const result = await deleteQuery.where('id', 'in', numericIds).where('tenant_id', '=', input.tenant_id).execute();

    return result !== null;
  }

  /**
   * Check whether any row exists that matches the key and column.
   */
  public async exists(input: { key: string; column: keyof Models[T] }, trx?: Transaction<Models>): Promise<boolean> {
    const columnRef = `${String(this.table)}.${String(input.column)}` as ReferenceExpression<Models, T>;

    const result = await this.getSelect(trx).where(columnRef, '=', input.key).limit(1).execute();

    return result.length > 0;
  }

  /**
   * Return top 3 rows matching key for autocomplete.
   */
  public find(
    input: {
      tenant_id: OperandValueExpressionOrList<Models, T, 'tenant_id'>;
      key: string;
      column: ReferenceExpression<Models, T>;
    },
    trx?: Transaction<Models>,
  ) {
    const options: QueryParams<T> = {
      columns: [input.column],
      limit: 3,
    };

    return this.getSelectWithColumns(options, trx)
      .where(input.column, 'ilike', input.key + '%')
      .where('tenant_id', '=', input.tenant_id)
      .limit(3)
      .execute();
  }

  /**
   * Get all rows for a tenant, with optional filtering.
   */
  public getAll(
    input: {
      tenant_id: OperandValueExpressionOrList<Models, T, 'tenant_id'>;
      options?: QueryParams<T>;
    },
    trx?: Transaction<Models>,
  ) {
    return this.getSelectWithColumns(input.options, trx).where('tenant_id', '=', input.tenant_id).execute();
  }

  /**
   * Get a single row by ID.
   * TODO: should also check userId
   */
  public getById(
    input: {
      tenant_id: OperandValueExpressionOrList<Models, T, 'tenant_id'>;
      id: OperandValueExpressionOrList<Models, T, 'id'>;
      options?: QueryParams<T>;
    },
    trx?: Transaction<Models>,
  ) {
    return this.getSelectWithColumns(input.options, trx)
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();
  }

  /**
   * Return the current timestamp from the DB.
   */
  public async nowTime(): Promise<QueryResult<INow>> {
    return (await sql`select now()::timestamp`.execute(BaseRepository._db)) as QueryResult<INow>;
  }

  /**
   * Start a transaction.
   */
  public transaction() {
    return BaseRepository._db.transaction();
  }

  /**
   * Update row by ID with new data.
   */
  public async update(
    input: {
      tenant_id: TypeTenantId<T>;
      id: TypeId<T>;
      row: OperationDataType<T, 'update'>;
    },
    trx?: Transaction<Models>,
  ) {
    return this.getUpdate(trx)
      .set(input.row)
      .where('id', '=', input.id as unknown as string)
      .where('tenant_id', '=', input.tenant_id as TypeColumnValue<T, 'tenant_id'>)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Apply filtering, selection, and pagination options to a query.
   */
  protected applyOptions(query: SelectQueryBuilder<Models, T, unknown>, options?: QueryParams<T>) {
    query = options?.columns ? query.select(options.columns as SelectExpression<Models, T>[]) : query.selectAll();
    query = options?.limit ? query.limit(options.limit) : query;
    query = options?.offset ? query.offset(options.offset) : query;
    query = options?.orderBy ? query.orderBy(options.orderBy) : query;
    query = options?.groupBy ? query.groupBy(options.groupBy as GroupByArg<Models, T, unknown>) : query;
    return query;
  }

  /**
   * Get delete query builder for this table.
   */
  protected getDelete(trx?: Transaction<Models>) {
    return trx ? trx.deleteFrom(this.table) : BaseRepository._db.deleteFrom(this.table);
  }

  /**
   * Get insert query builder for this table.
   */
  protected getInsert(trx?: Transaction<Models>): InsertQueryBuilder<Models, T, InsertResult> {
    return trx ? trx.insertInto(this.table) : BaseRepository._db.insertInto(this.table);
  }

  /**
   * Get select query builder for this table.
   */
  protected getSelect(trx?: Transaction<Models>) {
    const ret = trx ? trx.selectFrom(this.table) : BaseRepository._db.selectFrom(this.table);

    return ret as SelectQueryBuilder<Models, T, Models[T]>;
  }

  /**
   * Get select query builder with options applied.
   */
  protected getSelectWithColumns(options?: QueryParams<T>, trx?: Transaction<Models>) {
    const query = this.getSelect(trx);
    return this.applyOptions(query, options);
  }

  /**
   * Get update query builder for this table.
   */
  protected getUpdate(trx?: Transaction<Models>) {
    const ret = trx ? trx.updateTable(this.table) : BaseRepository._db.updateTable(this.table);
    return ret as unknown as UpdateQueryBuilder<Models, T, keyof Models, object>;
  }
}

/**
 * Extended version of QueryParams for joined tables with looser typing.
 * TODO: fix it
 */
export type JoinedQueryParams = {
  searchStr?: string;
  startRow?: number;
  endRow?: number;
  sortModel?: {
    colId: string;
    sort: 'asc' | 'desc';
  }[];
  filterModel?: Record<string, unknown>;
  columns?: (string | ReferenceExpression<Models, keyof Models> | TypeTableColumns<keyof Models>)[];
  groupBy?: (string | SelectExpression<Models, keyof Models>)[];
  limit?: number;
  offset?: number;
  orderBy?: OrderByExpression<Models, keyof Models, object>[];
};

/**
 * The options that can be passed to query the database,
 * allowing you to select columns, limit, offset, order, and group the results.
 */
export type QueryParams<T extends keyof Models> = {
  searchStr?: string;
  startRow?: number;
  endRow?: number;
  sortModel?: {
    colId: string;
    sort: 'asc' | 'desc';
  }[];
  filterModel?: Record<string, unknown>;
  columns?: ReferenceExpression<Models, T>[];
  groupBy?: (keyof Models[T])[];
  limit?: number;
  offset?: number;
  orderBy?: OrderByExpression<Models, T, object>[];
};

/**
 * Helper to create a typed reference expression to a column in a table.
 */
export function ref<TTable extends keyof Models, TColumn extends keyof Models[TTable]>(
  table: TTable,
  column: TColumn,
): ReferenceExpression<Models, TTable> {
  return `${String(table)}.${String(column)}` as ReferenceExpression<Models, TTable>;
}
