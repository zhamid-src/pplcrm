import { sql } from "kysely";
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

  protected getQuery(options?: QueryParams<T>) {
    let query = db.selectFrom(this.table);

    query = options?.columns
      ? query.select(options.columns)
      : query.selectAll();
    query = options?.limit ? query.limit(options.limit) : query;
    query = options?.offset ? query.offset(options.offset) : query;
    query = options?.orderBy ? query.orderBy(options.orderBy) : query;
    query = options?.groupBy ? query.groupBy(options.groupBy) : query;

    return query;
  }

  public getAll(options?: QueryParams<T>) {
    return this.getQuery(options).execute();
  }

  public getOneById(
    id: GetOperandType<T, "select", "id">,
    options?: QueryParams<T>,
  ) {
    return this.getQuery(options).where("id", "=", id).executeTakeFirst();
  }
  public getCount() {
    return db
      .selectFrom(this.table)
      .select(sql<string>`count(*)`.as("count"))
      .executeTakeFirst();
  }

  public async add(row: OperationDataType<T, "insert">) {
    return db.insertInto(this.table).values(row).executeTakeFirst();
  }

  public async update(
    id: GetOperandType<T, "update", "id">,
    row: OperationDataType<T, "update">,
  ) {
    return db
      .updateTable(this.table)
      .set(row)
      .where("id", "=", id)
      .executeTakeFirst();
  }

  public async delete(id: GetOperandType<T, "select", "id">) {
    return db.deleteFrom(this.table).where("id", "=", id).executeTakeFirst();
  }
}
