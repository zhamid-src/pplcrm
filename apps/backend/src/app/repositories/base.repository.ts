// tsco:ignore
import { INow } from '@common';
import { promises as fs } from 'fs';
import {
  FileMigrationProvider,
  InsertQueryBuilder,
  InsertResult,
  Kysely,
  Migrator,
  PostgresDialect,
  QueryResult,
  SelectQueryBuilder,
  Transaction,
  sql,
} from 'kysely';
import {
  InsertObject,
  InsertObjectOrList,
} from 'node_modules/kysely/dist/cjs/parser/insert-values-parser';
import { ExtractTableAlias } from 'node_modules/kysely/dist/cjs/parser/table-parser';
import path from 'path';
import { Pool } from 'pg';
import {
  GroupDataType,
  Models,
  TableColumnsType,
  TableIdType,
  UpdateRow,
} from '../../../../../common/src/lib/kysely.models';

export type QueryParams<T extends keyof Models> = {
  columns?: TableColumnsType<T>[];
  limit?: number;
  offset?: number;
  orderBy?: GroupDataType<T>[];
  groupBy?: GroupDataType<T>[];
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
 * Other tables should extend this class.
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

  public async addMany(rows: ReadonlyArray<InsertObject<Models, T>>, trx?: Transaction<Models>) {
    return this.getInsert(trx).values(rows).returningAll().execute();
  }

  public async addOne(row: InsertObjectOrList<Models, T>, trx?: Transaction<Models>) {
    return this.getInsert(trx).values(row).returningAll().executeTakeFirst();
  }

  public async deleteOne(id: TableIdType<T>, trx?: Transaction<Models>) {
    return this.getDelete(trx).where('id', '=', id).execute();
  }

  public findAll(options?: QueryParams<T>, trx?: Transaction<Models>) {
    return this.getSelectWithColumns(options, trx).execute();
  }

  public findOne(id: TableIdType<T>, options?: QueryParams<T>, trx?: Transaction<Models>) {
    return this.getSelectWithColumns(options, trx).where('id', '=', id).executeTakeFirst();
  }

  public async getCount(trx?: Transaction<Models>) {
    const query = sql<string>`count(*)`.as('count');
    const { count } = (await this.getSelect(trx).select(query).executeTakeFirst()) || {
      count: '0',
    };
    return count;
  }

  public async nowTime(): Promise<QueryResult<INow>> {
    return (await sql`select now()::timestamp`.execute(BaseRepository.db)) as QueryResult<INow>;
  }

  public async updateOne(id: TableIdType<T>, row: UpdateRow<T>, trx?: Transaction<Models>) {
    return this.getUpdate(trx).set(row).where('id', '=', id).returningAll().executeTakeFirst();
  }

  public transaction() {
    return BaseRepository.db.transaction();
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

  protected getDelete(trx?: Transaction<Models>) {
    return trx ? trx.deleteFrom(this.table) : BaseRepository.db.deleteFrom(this.table);
  }

  protected getInsert(trx?: Transaction<Models>): InsertQueryBuilder<Models, T, InsertResult> {
    return trx ? trx.insertInto(this.table) : BaseRepository.db.insertInto(this.table);
  }

  protected getSelect(trx?: Transaction<Models>) {
    return trx ? trx.selectFrom(this.table) : BaseRepository.db.selectFrom(this.table);
  }

  protected getSelectWithColumns(options?: QueryParams<T>, trx?: Transaction<Models>) {
    const query = this.getSelect(trx);
    return this.applyOptions(query, options);
  }

  protected getUpdate(trx?: Transaction<Models>) {
    return trx ? trx.updateTable(this.table) : BaseRepository.db.updateTable(this.table);
  }
}
