// tsco:ignore
import { INow } from '@common';
import { promises as fs } from 'fs';
import {
  FileMigrationProvider,
  InsertQueryBuilder,
  InsertResult,
  Kysely,
  Migrator,
  OrderByExpression,
  PostgresDialect,
  QueryResult,
  ReferenceExpression,
  SelectQueryBuilder,
  Transaction,
  sql,
} from 'kysely';
import { GroupByArg } from 'kysely/dist/cjs/parser/group-by-parser';
import { ExtractTableAlias } from 'node_modules/kysely/dist/cjs/parser/table-parser';
import path from 'path';
import { Pool } from 'pg';
import {
  GetOperandType,
  Keys,
  Models,
  OperationDataType,
  TableColumnsType,
  TableIdType,
  TablesOperationMap,
} from '../../../../../common/src/lib/kysely.models';

/**
 * The options that can be passed to the query the database
 * allowing you to select some columns, limiting the result
 * set, ordering the result set, and grouping the result set.
 */
export type QueryParams<T extends keyof Models> = {
  columns?: TableColumnsType<T>[];
  limit?: number;
  offset?: number;
  orderBy?: OrderByExpression<Models, ExtractTableAlias<Models, T>, object>[];
  groupBy?: GroupByArg<Models, ExtractTableAlias<Models, T>, object>;
};

const dialect = new PostgresDialect({
  pool: new Pool({
    // connectionString: process.env["DATABASE_URL"],
    user: 'zeehamid',
    database: 'pplcrm',
    password: 'Eternity#1',
    port: 5432,
    host: 'localhost',
    ssl: false,
  }),
});

/**
 * The base operator class that implements regular db functions.
 * Other tables should extend this class. There is generally a
 * one to one mapping between dB table and repository class.
 *
 * @example - the followng class will enable all CRUD operations for the persons table:
 *
 * export class PersonsRepository extends BaseRepository<'persons'> {
 *   constructor() {
 *     super('persons');
 *   }
 *  }
 */
export class BaseRepository<T extends keyof Models> {
  protected readonly table: T;
  // All dB operations should happen through this class,
  // so keep this private
  private static db = new Kysely<Models>({
    dialect,
  });

  private static migrationFolder = path.join(__dirname, './_migrations');
  public static migrator = new Migrator({
    db: BaseRepository.db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: BaseRepository.migrationFolder,
    }),
  });

  constructor(tableIn: T) {
    this.table = tableIn;
  }

  /**
   * Add all given rows to the table.
   *
   * @returns - newly added rows
   */
  public async addMany(rows: OperationDataType<T, 'insert'>[], trx?: Transaction<Models>) {
    return this.getInsert(trx).values(rows).returningAll().execute();
  }

  public async addOrGet(
    row: OperationDataType<T, 'insert'>,
    onConflictColumn: { [X in T]: keyof Models[T] }[T] & string,
    trx?: Transaction<Models>,
  ) {
    const insertResult = await this.getInsert(trx)
      .values(row)
      .onConflict((oc) => oc.column(onConflictColumn).doNothing())
      .returningAll()
      .executeTakeFirst();

    if (insertResult) {
      return insertResult;
    } else {
      const lhs = onConflictColumn as ReferenceExpression<Models, ExtractTableAlias<Models, T>>;
      const selectResult = await this.getSelect(trx)
        .selectAll()
        .where(lhs, '=', row['name'])
        .executeTakeFirst();
      return selectResult;
    }
  }

  /**
   * Add the given row to the table.
   *
   * @returns - newly added row
   */
  public async add(row: OperationDataType<T, 'insert'>, trx?: Transaction<Models>) {
    console.log('>>>>', row);
    return this.getInsert(trx).values(row).returningAll().executeTakeFirst();
  }

  /**
   * Delete the row that matches the given id.
   */
  public async delete(
    id: GetOperandType<T, 'select', Keys<TablesOperationMap[T]['select']>>,
    trx?: Transaction<Models>,
  ) {
    return this.getDelete(trx).where('id', '=', id).execute();
  }

  /**
   * Get all rows that matches the given options.
   *
   * @see {@link QueryParams} for more information about the options.
   */
  public getAll(options?: QueryParams<T>, trx?: Transaction<Models>) {
    return this.getSelectWithColumns(options, trx).execute();
  }

  /**
   * Get the first row that matches the given ID
   *
   * @see {@link QueryParams} for more information about the options.
   */
  public getById(id: TableIdType<T>, options?: QueryParams<T>, trx?: Transaction<Models>) {
    return this.getSelectWithColumns(options, trx).where('id', '=', id).executeTakeFirst();
  }

  /**
   * Get the first row that matches the given ID
   *
   * @see {@link QueryParams} for more information about the options.
   */
  public async exists(
    key: string,
    column: TableColumnsType<T>,
    trx?: Transaction<Models>,
  ): Promise<boolean> {
    const column_lhs = column as ReferenceExpression<Models, ExtractTableAlias<Models, T>>;
    const result = await this.getSelect(trx)
      .select(column)
      .where(column_lhs, '=', key)
      .executeTakeFirst();
    return result !== undefined;
  }

  /**
   * Get the count of rows in the table.
   *
   * Optionally, if the call is part of the transaction, pass the transaction
   *
   * @returns - returns the count as a string
   */
  public async count(trx?: Transaction<Models>): Promise<string> {
    const query = sql<string>`count(*)`.as('count');
    const { count } = (await this.getSelect(trx).select(query).executeTakeFirst()) || {
      count: '0',
    };
    return count;
  }

  /**
   *
   * @returns The current time in the database
   */
  public async nowTime(): Promise<QueryResult<INow>> {
    return (await sql`select now()::timestamp`.execute(BaseRepository.db)) as QueryResult<INow>;
  }

  /**
   * Return the top three rows that match the given key.
   * It's used for autocomplete.
   *
   * @param key - the key to match
   * @param column - the column to search. Example "name"
   * @param tenant_id - the tenant ID to limit the search to
   * @returns
   */
  public async find(
    key: string,
    column: TableColumnsType<T>,
    tenant_id: bigint,
    trx?: Transaction<Models>,
  ) {
    const tenant_id_lhs = 'tenant_id' as ReferenceExpression<Models, ExtractTableAlias<Models, T>>;
    const column_lhs = column as ReferenceExpression<Models, ExtractTableAlias<Models, T>>;
    const rhs = key + '%';
    return this.getSelect(trx)
      .select([column])
      .limit(3)
      .where(column_lhs, 'ilike', rhs)
      .where(tenant_id_lhs, '=', tenant_id)
      .execute();
  }

  /**
   * Update the row that matches the given id, overriding columns with the given values.
   *
   * @returns The updated row
   */
  public async update(
    id: GetOperandType<T, 'update', Keys<TablesOperationMap[T]['update']>>,
    row: OperationDataType<T, 'update'>,
    trx?: Transaction<Models>,
  ) {
    return this.getUpdate(trx).set(row).where('id', '=', id).returningAll().executeTakeFirst();
  }

  /**
   * Create a transaction. The returned transaction object can be used to
   * execute queries in the context of the transaction.
   *
   * @example
   *  this.persons.transaction().execute(async (trx) => {
   *     this.persons.addOne({ first_name: 'John', last_name: 'Doe' }, trx);
   *     this.persons.addOne({ first_name: 'Jane', last_name: 'Doe' }, trx);
   *  }
   *
   * @returns the transaction object
   */
  public transaction() {
    return BaseRepository.db.transaction();
  }

  /**
   * Apply given options to the query.
   *
   */
  protected applyOptions(
    query: SelectQueryBuilder<Models, ExtractTableAlias<Models, T>, object>,
    options?: QueryParams<T>,
  ) {
    query = options?.columns ? query.select(options.columns) : query.selectAll();
    query = options?.limit ? query.limit(options.limit) : query;
    query = options?.offset ? query.offset(options.offset) : query;
    query = options?.orderBy ? query.orderBy(options.orderBy) : query;
    query = options?.groupBy ? query.groupBy(options.groupBy) : query;

    return query;
  }

  /**
   * Get the query builder for delete queries. If the transaction is passed,
   * the query builder will be created in the context of the transaction.
   *
   * It's better use this method instead of calling the deleteFrom directly
   * because it handles the transaction and keeps the db private from
   * the child classes.
   *
   * @returns - the query builder for delete queries
   */
  protected getDelete(trx?: Transaction<Models>) {
    return trx ? trx.deleteFrom(this.table) : BaseRepository.db.deleteFrom(this.table);
  }

  /**
   * Get the query builder for insert queries. If the transaction is passed,
   * the query builder will be created in the context of the transaction.
   *
   * It's better use this method instead of calling the insertInto directly
   * because it handles the transaction and keeps the db private from
   * the child classes.
   *
   * @returns - the query builder for insert queries
   */
  protected getInsert(trx?: Transaction<Models>): InsertQueryBuilder<Models, T, InsertResult> {
    return trx ? trx.insertInto(this.table) : BaseRepository.db.insertInto(this.table);
  }

  /**
   * Get the query builder for select queries. If the transaction is passed,
   * the query builder will be created in the context of the transaction.
   *
   * It's better use this method instead of calling the selectFrom directly
   * because it handles the transaction and keeps the db private from
   * the child classes.
   *
   * @returns - the query builder for select queries
   */
  protected getSelect(trx?: Transaction<Models>) {
    return trx ? trx.selectFrom(this.table) : BaseRepository.db.selectFrom(this.table);
  }

  /**
   * Get the query builder for select queries with the given options. If the transaction is passed,
   * the query builder will be created in the context of the transaction.
   *
   * It's better use this method instead of calling the selectFrom directly
   * because it handles the transaction and keeps the db private from
   * the child classes.
   *
   * @param options - the options to apply to the query
   *
   * @see {@link QueryParams} for more information about the options.
   *
   * @param trx
   * @returns - the query builder for select queries
   */
  protected getSelectWithColumns(options?: QueryParams<T>, trx?: Transaction<Models>) {
    const query = this.getSelect(trx) as SelectQueryBuilder<
      Models,
      ExtractTableAlias<Models, T>,
      object
    >;
    return this.applyOptions(query, options);
  }

  /**
   * Get the query builder for update queries. If the transaction is passed,
   * the query builder will be created in the context of the transaction.
   *
   * It's better use this method instead of calling the updateTable directly
   * because it handles the transaction and keeps the db private from
   * the child classes.
   *
   * @returns - the query builder for update queries
   */
  protected getUpdate(trx?: Transaction<Models>) {
    return trx ? trx.updateTable(this.table) : BaseRepository.db.updateTable(this.table);
  }
}
