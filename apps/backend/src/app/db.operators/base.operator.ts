import { ReferenceExpression, SelectQueryBuilder, sql } from "kysely";
import { InsertObjectOrList } from "node_modules/kysely/dist/cjs/parser/insert-values-parser";
import { ExtractTableAlias } from "node_modules/kysely/dist/cjs/parser/table-parser";
import {
  GetOperandType,
  GroupDataType,
  Models,
  OperationDataType,
  TableColumnsType,
} from "../kysely.models";
import { db } from "../kyselyiit";

export type QueryParams<T extends keyof Models> = {
  columns?: TableColumnsType<T>[];
  limit?: number;
  offset?: number;
  orderBy?: GroupDataType<T>[];
  groupBy?: GroupDataType<T>[];
};

export class BaseOperator<T extends keyof Models> {
  protected readonly table: T;

  constructor(tableIn: T) {
    this.table = tableIn;
  }

  public async add(row: InsertObjectOrList<Models, T>) {
    return db
      .insertInto(this.table)
      .values(row)
      .returningAll()
      .executeTakeFirst();
  }

  // delete
  public async delete(id: GetOperandType<T, "update", "id">) {
    return db.deleteFrom(this.table).where("id", "=", id).execute();
  }

  public getAll(options?: QueryParams<T>) {
    return this.getQuery(options).execute();
  }

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

  public getCount() {
    return db
      .selectFrom(this.table)
      .select(sql<string>`count(*)`.as("count"))
      .executeTakeFirst();
  }

  public getOneById(
    id: GetOperandType<T, "select", "id">,
    options?: QueryParams<T>,
  ) {
    return this.getQuery(options).where("id", "=", id).executeTakeFirst();
  }

  public async update(
    id: GetOperandType<T, "update", "id">,
    row: Partial<OperationDataType<T, "update">>,
  ) {
    return db
      .updateTable(this.table)
      .set(row)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
  }

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

  protected getQuery(options?: QueryParams<T>) {
    let query = db.selectFrom(this.table);
    query = this.getQueryWithOptions(query, options);
    return query;
  }
}
