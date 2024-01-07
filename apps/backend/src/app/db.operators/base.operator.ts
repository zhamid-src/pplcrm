import { INow } from '@common';
import {
  InsertQueryBuilder,
  InsertResult,
  QueryResult,
  SelectQueryBuilder,
  UpdateObject,
  sql,
} from 'kysely';
import {
  InsertObject,
  InsertObjectOrList,
} from 'node_modules/kysely/dist/cjs/parser/insert-values-parser';
import { ExtractTableAlias } from 'node_modules/kysely/dist/cjs/parser/table-parser';
import {
  GetOperandType,
  GroupDataType,
  Models,
  TableColumnsType,
} from '../../../../../common/src/lib/kysely.models';
import { db } from '../kyselyinit';

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

  public async addMany(rows: ReadonlyArray<InsertObject<Models, T>>) {
    return this.getInsert().values(rows).returningAll().execute();
  }

  public async addOne(row: InsertObjectOrList<Models, T>) {
    return this.getInsert().values(row).returningAll().executeTakeFirst();
  }
  public async deleteOne(id: GetOperandType<T, 'select', 'id'>) {
    return this.getDelete().where('id', '=', id).execute();
  }

  public findAll(options?: QueryParams<T>) {
    return this.getSelectWithColumns(options).execute();
  }

  public findOne(id: GetOperandType<T, 'select', 'id'>, options?: QueryParams<T>) {
    return this.getSelectWithColumns(options).where('id', '=', id).executeTakeFirst();
  }

  public getCount() {
    const query = sql<string>`count(*)`.as('count');
    return this.getSelect().select(query).executeTakeFirst();
  }

  public async nowTime(): Promise<QueryResult<INow>> {
    return (await sql`select now()::timestamp`.execute(db)) as QueryResult<INow>;
  }

  public async updateOne(
    id: GetOperandType<T, 'update', 'id'>,
    row: UpdateObject<Models, ExtractTableAlias<Models, T>, ExtractTableAlias<Models, T>>,
  ) {
    return this.getUpdate().set(row).where('id', '=', id).returningAll().executeTakeFirst();
  }

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

  protected getDelete() {
    return db.deleteFrom(this.table);
  }

  protected getInsert(): InsertQueryBuilder<Models, T, InsertResult> {
    return db.insertInto(this.table);
  }

  protected getSelect() {
    return db.selectFrom(this.table);
  }

  protected getSelectWithColumns(options?: QueryParams<T>) {
    const query = this.getSelect();
    return this.applyOptions(query, options);
  }

  protected getUpdate() {
    return db.updateTable(this.table);
  }
}
