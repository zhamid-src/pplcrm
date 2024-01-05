import {
  ReferenceExpression,
  SelectQueryBuilder,
  UpdateObject,
  sql,
} from "kysely";
import {
  InsertObjectOrList,
  InsertObjectOrListFactory,
} from "node_modules/kysely/dist/cjs/parser/insert-values-parser";
import { ExtractTableAlias } from "node_modules/kysely/dist/cjs/parser/table-parser";
import {
  GetOperandType,
  GroupDataType,
  Models,
  TableColumnsType,
} from "../../../../../common/src/lib/kysely.models";
import { db } from "../kyselyinit";

export type QueryParams<T extends keyof Models> = {
  columns?: TableColumnsType<T>[];
  limit?: number;
  offset?: number;
  orderBy?: GroupDataType<T>[];
  groupBy?: GroupDataType<T>[];
};

/**
 * The base operator class that implements regular db functions
 */
export class BaseOperator<T extends keyof Models> {
  protected readonly table: T;

  constructor(tableIn: T) {
    this.table = tableIn;
  }

  /**
   * Add a single row
   * @param row
   * @returns the row added
   */
  public async add(row: InsertObjectOrList<Models, T>) {
    return db
      .insertInto(this.table)
      .values(row)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Add all given rows
   * @param row
   * @returns the rows added
   */
  public async addMany(rows: InsertObjectOrListFactory<Models, T>) {
    return db
      .insertInto(this.table)
      .values(rows)
      .returningAll()
      .executeTakeFirst();
  }

  // delete
  public async delete(id: GetOperandType<T, "update", "id">) {
    return db.deleteFrom(this.table).where("id", "=", id).execute();
  }

  /**
   * Delete all rows with the given ids
   * @param ids
   * @returns rows
   */
  public async deleteMany(ids: GetOperandType<T, "update", "id">[]) {
    return db
      .deleteFrom(this.table)
      .where("id", "in", ids)
      .returningAll()
      .execute();
  }

  /**
   * GEt all the rows that match the given options
   * @param options
   * @returns matched rows
   */
  public getAll(options?: QueryParams<T>) {
    return this.getQuery(options).execute() as Promise<Partial<T>[]>;
  }

  /**
   * Get the number of rows in the table
   * @returns The count as number
   */
  public getCount() {
    return db
      .selectFrom(this.table)
      .select(sql<string>`count(*)`.as("count"))
      .executeTakeFirst();
  }

  /**
   * Get the row that matches the given ID (there should be only one)
   * @param id
   * @param options - typically used to restrict columns
   * @returns
   */
  public getOneById(
    id: GetOperandType<T, "select", "id">,
    options?: QueryParams<T>,
  ) {
    return this.getQuery(options).where("id", "=", id).executeTakeFirst();
  }

  /**
   * Get the time when the password reset code was created
   * TODO: move to authuser or something
   * @param code
   * @returns
   */
  public getPasswordResetCodeTime(code: string) {
    const codeColumn = "password_reset_code" as ReferenceExpression<
      Models,
      ExtractTableAlias<Models, T>
    >;
    const columns = ["password_reset_code_created_at"] as TableColumnsType<T>[];
    return this.getQuery({ columns })
      .where(codeColumn, "=", code)
      .executeTakeFirstOrThrow();
  }

  /**
   * Update the row for the given ID, replacing all values
   * @param id
   * @param row
   * @returns the new row
   */
  public async update(
    id: GetOperandType<T, "update", "id">,
    row: UpdateObject<
      Models,
      ExtractTableAlias<Models, T>,
      ExtractTableAlias<Models, T>
    >,
  ) {
    return db
      .updateTable(this.table)
      .set(row)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Get the query builder for the table for delete
   * @returns
   */
  protected deleteFrom() {
    return db.deleteFrom(this.table);
  }

  /**
   * Get the query builder for the table with the given options
   * @param options
   * @returns
   */
  protected getQuery(options?: QueryParams<T>) {
    let query = this.selectFrom();
    query = this.getQueryWithOptions(query, options);
    return query;
  }

  /**
   * Extend the query builder for the table with the given options
   * @param options
   * @returns
   */
  protected getQueryWithOptions(
    query: SelectQueryBuilder<Models, ExtractTableAlias<Models, T>, object>,
    options?: QueryParams<T>,
  ) {
    query = options?.columns
      ? query.select(options.columns)
      : query.selectAll();
    query = options?.limit ? query.limit(options.limit) : query;
    query = options?.offset ? query.offset(options.offset) : query;
    query = options?.orderBy ? query.orderBy(options.orderBy) : query;
    query = options?.groupBy ? query.groupBy(options.groupBy) : query;

    return query;
  }

  /**
   * Get the query builder for the table for select
   * @returns
   */
  protected selectFrom() {
    return db.selectFrom(this.table);
  }

  /**
   * Get the query builder for the table for update
   * @returns
   */
  protected updateTable() {
    return db.updateTable(this.table);
  }
}
