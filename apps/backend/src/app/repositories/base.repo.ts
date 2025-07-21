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
  SelectExpression,
  SelectQueryBuilder,
  Transaction,
  UpdateQueryBuilder,
  sql,
} from "kysely";
import { Pool } from "pg";
import path from "path";
import { promises as fs } from "fs";
import {
  ColumnValue,
  Models,
  OperationDataType,
  TypeColumnValue,
  TypeId,
  TypeTenantId,
} from "../../../../../common/src/lib/kysely.models";
import { INow } from "@common";

/**
 * The options that can be passed to the query the database
 * allowing you to select some columns, limiting the result
 * set, ordering the result set, and grouping the result set.
 */
export type QueryParams<T extends keyof Models> = {
  columns?: SelectExpression<Models, keyof Models>[];
  limit?: number;
  offset?: number;
  orderBy?: OrderByExpression<Models, T, object>[];
  groupBy?: (keyof Models[T])[];
};

export type JoinedQueryParams = {
  columns?: (string | SelectExpression<Models, keyof Models>)[];
  limit?: number;
  offset?: number;
  orderBy?: OrderByExpression<Models, keyof Models, object>[];
  groupBy?: (string | SelectExpression<Models, keyof Models>)[];
};

export function ref<
  TTable extends keyof Models,
  TColumn extends keyof Models[TTable],
>(table: TTable, column: TColumn): ReferenceExpression<Models, TTable> {
  return `${String(table)}.${String(column)}` as ReferenceExpression<
    Models,
    TTable
  >;
}

export function refCol<
  TTable extends keyof Models,
  TColumn extends SelectExpression<Models, keyof Models>,
>(table: TTable, column: TColumn): ReferenceExpression<Models, TTable> {
  return `${String(table)}.${String(column)}` as ReferenceExpression<
    Models,
    TTable
  >;
}

const dialect = new PostgresDialect({
  pool: new Pool({
    user: "zeehamid",
    database: "pplcrm",
    password: "Eternity#1",
    port: 5432,
    host: "localhost",
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

  private static migrationFolder = path.resolve(
    process.cwd(),
    "apps/backend/src/app/_migrations",
  );

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
  public async addMany(
    input: { rows: OperationDataType<T, "insert">[] },
    trx?: Transaction<Models>,
  ) {
    return this.getInsert(trx).values(input.rows).returningAll().execute();
  }

  public async addOrGet<K extends keyof Models[T] & string>(
    input: {
      row: OperationDataType<T, "insert">;
      onConflictColumn: K;
    },
    trx?: Transaction<Models>,
  ): Promise<Models[T] | undefined> {
    const insertResult = await this.getInsert(trx)
      .values(input.row)
      .onConflict((oc) => oc.column(input.onConflictColumn).doNothing())
      .returningAll()
      .executeTakeFirst();

    if (insertResult) {
      return insertResult as unknown as Models[T];
    } else {
      const matchValue = input.row[input.onConflictColumn];
      if (matchValue === undefined) {
        throw new Error(
          `Missing value for conflict column: ${String(input.onConflictColumn)}`,
        );
      }

      const lhs = input.onConflictColumn as ReferenceExpression<Models, T>;
      return this.getSelect(trx)
        .selectAll()
        .where(lhs, "=", input.row["name"])
        .executeTakeFirst() as unknown as Models[T] | undefined;
    }
  }

  /**
   * Add the given row to the table.
   *
   * @returns - newly added row
   */
  public async add(
    input: { row: OperationDataType<T, "insert"> },
    trx?: Transaction<Models>,
  ) {
    return this.getInsert(trx)
      .values(input.row)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Delete the row that matches the given id.
   */
  public async delete(
    input: { tenant_id: TypeTenantId<T>; id: TypeId<T> },
    trx?: Transaction<Models>,
  ) {
    // TODO: zee - ids should be an array I think.
    return this.deleteMany({ tenant_id: input.tenant_id, ids: input.id }, trx);
  }

  /**
   * Delete the rows that matches the given ids.
   */
  public async deleteMany(
    input: { tenant_id: TypeTenantId<T>; ids: TypeId<T> },
    trx?: Transaction<Models>,
  ) {
    const deleteQuery = this.getDelete(trx) as unknown as ReturnType<
      typeof BaseRepository.prototype.getDelete
    >;

    const result = await deleteQuery
      .where("id", "in", input.ids)
      .where("tenant_id", "=", input.tenant_id)
      .execute();

    return result !== null;
  }

  /**
   * Get all rows that matches the given options.
   *
   * @see {@link QueryParams} for more information about the options.
   */
  public getAll(
    input: { tenant_id: TypeTenantId<T>; options?: QueryParams<T> },
    trx?: Transaction<Models>,
  ) {
    const tenantRef = refCol(this.table, "tenant_id");

    return this.getSelectWithColumns(input.options, trx)
      .where(tenantRef, "=", input.tenant_id)
      .execute();
  }

  /**
   * Get the first row that matches the given ID
   *
   * @see {@link QueryParams} for more information about the options.
   */
  public getById(
    input: {
      tenant_id: TypeTenantId<T>;
      id: TypeId<T>;
      options?: QueryParams<T>;
    },
    trx?: Transaction<Models>,
  ) {
    const idRef = refCol(this.table, "id");
    const tenantRef = refCol(this.table, "tenant_id");

    return this.getSelectWithColumns(input.options, trx)
      .where(idRef, "=", input.id)
      .where(tenantRef, "=", input.tenant_id)
      .executeTakeFirst();
  }

  /**
   * Get the first row that matches the given ID
   *
   * @see {@link QueryParams} for more information about the options.
   */
  public async exists(
    input: { key: string; column: keyof Models[T] },
    trx?: Transaction<Models>,
  ): Promise<boolean> {
    const columnRef =
      `${String(this.table)}.${String(input.column)}` as ReferenceExpression<
        Models,
        T
      >;

    const result = await this.getSelect(trx)
      .where(columnRef, "=", input.key)
      .limit(1)
      .execute();

    return result.length > 0;
  }

  /**
   * Get the count of rows in the table.
   *
   * Optionally, if the call is part of the transaction, pass the transaction
   *
   * @returns - returns the count as a string
   */
  public async count(
    tenant_id: TypeTenantId<T>,
    trx?: Transaction<Models>,
  ): Promise<number> {
    const tenantRef = refCol(this.table, "tenant_id");

    const result = await this.getSelect(trx)
      .select(({ fn }) => [fn.countAll<number>().as("count")])
      .where(tenantRef, "=", tenant_id)
      .executeTakeFirst();
    return result?.count ?? 0;
  }

  /**
   *
   * @returns The current time in the database
   */
  public async nowTime(): Promise<QueryResult<INow>> {
    return (await sql`select now()::timestamp`.execute(
      BaseRepository.db,
    )) as QueryResult<INow>;
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
    input: {
      tenant_id: TypeTenantId<T>;
      key: string;
      column: SelectExpression<Models, keyof Models>;
    },
    trx?: Transaction<Models>,
  ) {
    const columnRef = refCol(this.table, input.column);
    const tenantRef = refCol(this.table, "tenant_id");

    const options: QueryParams<T> = {
      columns: [input.column],
      limit: 3,
    };

    return this.getSelectWithColumns(options, trx)
      .where(columnRef, "ilike", input.key + "%")
      .where(tenantRef, "=", input.tenant_id)
      .limit(3)
      .execute();
  }

  /**
   * Update the row that matches the given id, overriding columns with the given values.
   *
   * @returns The updated row
   */
  public async update(
    input: {
      tenant_id: TypeTenantId<T>;
      id: TypeId<T>;
      row: OperationDataType<T, "update">;
    },
    trx?: Transaction<Models>,
  ) {
    return this.getUpdate(trx)
      .set(input.row)
      .where("id", "=", input.id as unknown as string)
      .where(
        "tenant_id",
        "=",
        input.tenant_id as TypeColumnValue<T, "tenant_id">,
      )
      .returningAll()
      .executeTakeFirst();
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
    query: SelectQueryBuilder<Models, T, unknown>,
    options?: QueryParams<T>,
  ) {
    query = options?.columns
      ? this.getSelectWithColumns(options)
      : query.selectAll();
    query = options?.limit ? query.limit(options.limit) : query;
    query = options?.offset ? query.offset(options.offset) : query;
    query = options?.orderBy ? query.orderBy(options.orderBy) : query;
    query = options?.groupBy ? query.groupBy(options.groupBy as any) : query;
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
    return trx
      ? trx.deleteFrom(this.table)
      : BaseRepository.db.deleteFrom(this.table);
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
  protected getInsert(
    trx?: Transaction<Models>,
  ): InsertQueryBuilder<Models, T, InsertResult> {
    return trx
      ? trx.insertInto(this.table)
      : BaseRepository.db.insertInto(this.table);
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
    const ret = trx
      ? trx.selectFrom(this.table)
      : BaseRepository.db.selectFrom(this.table);

    return ret as unknown as SelectQueryBuilder<Models, T, Models[T]>;
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
  protected getSelectWithColumns(
    options?: QueryParams<T>,
    trx?: Transaction<Models>,
  ) {
    const query = this.getSelect(trx);
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
    const ret = trx
      ? trx.updateTable(this.table)
      : BaseRepository.db.updateTable(this.table);

    return ret as unknown as UpdateQueryBuilder<
      Models,
      T,
      keyof Models,
      object
    >;
  }
}
