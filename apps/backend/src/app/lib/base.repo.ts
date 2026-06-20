// tsco:ignore

import { INow, QueryBuilderGroupNode } from '../../../../../libs/common/src';

import { promises as fs } from 'fs';
import {
  DeleteQueryBuilder,
  DeleteResult,
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
  Selectable,
  Transaction,
  UpdateQueryBuilder,
  UpdateResult,
  sql,
} from 'kysely';
import path from 'path';

import {
  Models,
  OperationDataType,
  TypeId,
  TypeTableColumns,
  TypeTenantId,
} from '../../../../../libs/common/src/lib/kysely.models';
import { Pool } from 'pg';
import { env } from '../../env';
const dialect = new PostgresDialect({
  pool: new Pool(env.db),
});

type ColName<TB extends keyof Models> = keyof Models[TB] & string;

export class BaseRepository<T extends keyof Models> {
  private static _db = new Kysely<Models>({ dialect });
  private static _migrationFolder = path.resolve(process.cwd(), 'apps/backend/src/app/_migrations');

  public static get dbInstance(): Kysely<Models> {
    return BaseRepository._db;
  }

  protected readonly table: T;

  public static migrator = new Migrator({
    db: BaseRepository._db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: BaseRepository._migrationFolder,
    }),
  });

  constructor(tableIn: T) {
    this.table = tableIn;
  }

  public getTableName(): T {
    return this.table;
  }

  public get db() {
    return BaseRepository._db;
  }

  public async add(input: { row: OperationDataType<T, 'insert'> }, trx?: Transaction<Models>) {
    const results = await this.addMany({ rows: [input.row] }, trx);
    return results[0];
  }

  public async addMany(input: { rows: OperationDataType<T, 'insert'>[] }, trx?: Transaction<Models>) {
    return this.getInsert(trx).values(input.rows).returningAll().execute();
  }

  public async addOrGet<K extends keyof Models[T] & string>(
    input: {
      row: OperationDataType<T, 'insert'>;
      onConflictColumn: K;
    },
    trx?: Transaction<Models>,
  ): Promise<Selectable<Models[T]> | undefined> {
    const insertResult = await this.getInsert(trx)
      .values(input.row)
      .onConflict((oc) => oc.columns(['tenant_id', input.onConflictColumn]).doNothing())
      .returningAll()
      .executeTakeFirst();

    if (insertResult) return insertResult as unknown as Selectable<Models[T]>;

    const matchValue = input.row[input.onConflictColumn as unknown as keyof OperationDataType<T, 'insert'>];
    if (matchValue === undefined) {
      throw new Error(`Missing value for conflict column: ${String(input.onConflictColumn)}`);
    }

    const lhs = input.onConflictColumn as ReferenceExpression<Models, T>;
    return this.getSelect(trx)
      .selectAll()
      .where(lhs, '=', matchValue)
      .where('tenant_id', '=', input.row.tenant_id as any)
      .executeTakeFirst() as unknown as Selectable<Models[T]> | undefined;
  }

  public async count(tenant_id: TypeTenantId<T>, trx?: Transaction<Models>): Promise<number> {
    let query = this.getSelect(trx).select(({ fn }) => [fn.countAll<number>().as('count')]);
    if (this.table !== 'tenants') {
      query = query.where('tenant_id' as ReferenceExpression<Models, T>, '=', tenant_id);
    }
    const result = await query.executeTakeFirst();
    return Number(result?.count ?? 0);
  }

  public async delete(input: { tenant_id: TypeTenantId<T>; id: TypeId<T> }, trx?: Transaction<Models>) {
    return this.deleteMany({ tenant_id: input.tenant_id, ids: [input.id] }, trx);
  }

  public async deleteMany(input: { tenant_id: TypeTenantId<T>; ids: TypeId<T>[] }, trx?: Transaction<Models>) {
    // Convert to numbers if needed
    const numericIds = input.ids;

    if (numericIds.length === 0) return false;

    const deleteQuery = this.getDelete(trx);
    let query = deleteQuery.where('id' as ReferenceExpression<Models, T>, 'in', numericIds);
    if (this.table !== 'tenants') {
      query = query.where('tenant_id' as ReferenceExpression<Models, T>, '=', input.tenant_id);
    }
    const result = await query.executeTakeFirst();

    return Number(result?.numDeletedRows ?? 0) > 0;
  }

  public async exists(input: { key: string; column: keyof Models[T] }, trx?: Transaction<Models>): Promise<boolean> {
    const columnRef = `${String(this.table)}.${String(input.column)}` as ReferenceExpression<Models, T>;
    const result = await this.getSelect(trx).where(columnRef, '=', input.key).limit(1).execute();
    return result.length > 0;
  }

  public find(
    input: {
      tenant_id: TypeTenantId<T>;
      key: string;
      column: ReferenceExpression<Models, T>;
    },
    trx?: Transaction<Models>,
  ) {
    const options: QueryParams<T> = {
      columns: [input.column],
      limit: 3,
    };

    if (!input.key) {
      // If no key provided, return empty result
      return Promise.resolve([]);
    }

    let query = this.getSelectWithColumns(options, trx).where(input.column, 'ilike', input.key + '%');
    if (this.table !== 'tenants') {
      query = query.where('tenant_id' as ReferenceExpression<Models, T>, '=', input.tenant_id);
    }
    return query.limit(3).execute();
  }

  public getAll(
    input: {
      tenant_id: TypeTenantId<T>;
      options?: QueryParams<T>;
    },
    trx?: Transaction<Models>,
  ) {
    let query = this.getSelectWithColumns(input.options, trx);
    if (this.table !== 'tenants') {
      query = query.where('tenant_id' as ReferenceExpression<Models, T>, '=', input.tenant_id);
    }
    return query.execute();
  }

  public async getAllWithCounts(
    input: {
      tenant_id: TypeTenantId<T>;
      options?: QueryParams<any>;
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const rows = await this.getAll(input, trx);
    return { rows, count: rows.length };
  }

  protected selectBy<C extends ColName<T>>(
    column: C,
    input: {
      tenant_id: TypeTenantId<T>;
      value: OperandValueExpressionOrList<Models, T, C>;
      options?: QueryParams<T>;
    },
    trx?: Transaction<Models>,
  ) {
    let query = this.getSelectWithColumns(input.options, trx).where(
      column as ReferenceExpression<Models, T>,
      '=',
      input.value as OperandValueExpressionOrList<Models, T, ReferenceExpression<Models, T>>,
    );
    if (this.table !== 'tenants') {
      query = query.where('tenant_id' as ReferenceExpression<Models, T>, '=', input.tenant_id);
    }
    return query;
  }

  public getOneBy<C extends ColName<T>>(
    column: C,
    input: {
      tenant_id: TypeTenantId<T>;
      value: OperandValueExpressionOrList<Models, T, C>;
      options?: QueryParams<T>;
    },
    trx?: Transaction<Models>,
  ) {
    return this.selectBy(column, input, trx).executeTakeFirst();
  }

  protected getManyBy<C extends ColName<T>>(
    column: C,
    input: {
      tenant_id: TypeTenantId<T>;
      value: OperandValueExpressionOrList<Models, T, C>;
      options?: QueryParams<T>;
    },
    trx?: Transaction<Models>,
  ) {
    return this.selectBy(column, input, trx).execute();
  }

  public async nowTime(): Promise<QueryResult<INow>> {
    return (await sql`select now()::timestamp`.execute(BaseRepository._db)) as QueryResult<INow>;
  }

  public transaction() {
    return BaseRepository._db.transaction();
  }

  public async update(
    input: {
      tenant_id: TypeTenantId<T>;
      id: TypeId<T>;
      row: OperationDataType<T, 'update'>;
    },
    trx?: Transaction<Models>,
  ) {
    if (Object.keys(input.row).length === 0) {
      return 0; // or just return early, nothing to update
    }
    let query = this.getUpdate(trx)
      .set(input.row as any)
      .where('id' as ReferenceExpression<Models, T>, '=', input.id);
    if (this.table !== 'tenants') {
      query = query.where('tenant_id' as ReferenceExpression<Models, T>, '=', input.tenant_id);
    }
    return query.returningAll().executeTakeFirst();
  }

  protected applyOptions(query: SelectQueryBuilder<Models, T, unknown>, options?: QueryParams<T>) {
    const opts: any = options ?? {};
    query = options?.columns
      ? query.select(
          options.columns.map((c) => {
            if (typeof c === 'string' && !c.includes('.')) {
              return `${String(this.table)}.${c}` as any;
            }
            return c;
          }) as SelectExpression<Models, T>[],
        )
      : query.selectAll(this.table);

    // Map AG Grid pagination (startRow/endRow) to limit/offset if not provided explicitly
    const hasLimit = typeof options?.limit === 'number';
    const hasOffset = typeof options?.offset === 'number';
    const startRow = typeof opts.startRow === 'number' ? opts.startRow : undefined;
    const endRow = typeof opts.endRow === 'number' ? opts.endRow : undefined;
    const derivedLimit = !hasLimit && typeof endRow === 'number' ? Math.max(0, endRow - (startRow ?? 0)) : undefined;
    const derivedOffset = !hasOffset && typeof startRow === 'number' ? startRow : undefined;

    const finalLimit = hasLimit ? options!.limit : derivedLimit;
    const finalOffset = hasOffset ? options!.offset : derivedOffset;

    query = typeof finalLimit === 'number' ? query.limit(finalLimit) : query;
    query = typeof finalOffset === 'number' ? query.offset(finalOffset) : query;

    // Map generic sortModel (from UI) to orderBy clauses when provided
    if (opts.sortModel && Array.isArray(opts.sortModel) && opts.sortModel.length > 0) {
      query = opts.sortModel.reduce((acc: any, sort: any) => {
        let col = sort.colId;
        if (typeof col === 'string' && !col.includes('.')) {
          // Check standard columns first
          const standardCols = ['id', 'tenant_id', 'createdby_id', 'updatedby_id', 'created_at', 'updated_at'];
          if (standardCols.includes(col)) {
            col = `${String(this.table)}.${col}`;
          } else {
            // Custom table columns checks
            const tableColsMap: Record<string, string[]> = {
              tasks: [
                'name',
                'details',
                'due_at',
                'status',
                'priority',
                'completed_at',
                'position',
                'assigned_to',
                'team_id',
                'file_id',
              ],
              persons: [
                'campaign_id',
                'household_id',
                'first_name',
                'middle_names',
                'last_name',
                'email',
                'email2',
                'mobile',
                'home_phone',
                'file_id',
                'company_id',
                'json',
                'notes',
                'linkedin',
                'twitter',
                'facebook',
                'instagram',
                'assigned_to',
              ],
            };
            const cols = tableColsMap[this.table as string];
            if (cols && cols.includes(col)) {
              col = `${String(this.table)}.${col}`;
            }
          }
        }
        return acc.orderBy(col as ReferenceExpression<Models, T>, sort.sort);
      }, query);
    }
    query = options?.orderBy ? query.orderBy(options.orderBy) : query;
    query = options?.groupBy ? query.groupBy(options.groupBy as any) : query;
    return query;
  }

  protected applyColumnFilter(query: any, column: string, filter: { op?: string; value?: any }) {
    if (!filter) {
      return query;
    }
    const op = filter.op || 'contains';
    const val = filter.value;

    if (op !== 'isEmpty' && op !== 'isNotEmpty') {
      if (val === undefined || val === null || String(val).trim() === '') {
        return query;
      }
    }

    // Allow users to type * as a wildcard character; normalize to SQL %.
    // The operator's own wrapping (startsWith → trailing %, contains → both, etc.)
    // is always applied on top — Postgres collapses consecutive %% automatically,
    // so 'zee*' with contains becomes '%zee%%' → effectively '%zee%'.
    const normalized = String(val).replace(/\*/g, '%');

    switch (op) {
      case 'equals':
        return query.where(column, 'ilike', normalized);
      case 'startsWith':
        return query.where(column, 'ilike', `${normalized}%`);
      case 'endsWith':
        return query.where(column, 'ilike', `%${normalized}`);
      case 'notContains':
        return query.where(column, 'not ilike', `%${normalized}%`);
      case 'notEquals':
        return query.where(column, 'not ilike', normalized);
      case 'isEmpty':
        return query.where((eb: any) => eb.or([eb(column, 'is', null), eb(column, '=', '')]));
      case 'isNotEmpty':
        return query.where((eb: any) => eb.and([eb(column, 'is not', null), eb(column, '!=', '')]));
      case 'contains':
      default:
        return query.where(column, 'ilike', `%${normalized}%`);
    }
  }

  protected applyCastColumnFilter(query: any, sqlExpression: any, filter: { op?: string; value?: any }) {
    if (!filter) {
      return query;
    }
    const op = filter.op || 'contains';
    const val = filter.value;

    if (op !== 'isEmpty' && op !== 'isNotEmpty') {
      if (val === undefined || val === null || String(val).trim() === '') {
        return query;
      }
    }

    // Allow users to type * as a wildcard; normalize to SQL %.
    // The operator's own wrapping is always applied — Postgres collapses %% naturally.
    const normalized = String(val).replace(/\*/g, '%');

    switch (op) {
      case 'equals':
        return query.where(sql`${sqlExpression} ILIKE ${normalized}` as any);
      case 'startsWith':
        return query.where(sql`${sqlExpression} ILIKE ${normalized + '%'}` as any);
      case 'endsWith':
        return query.where(sql`${sqlExpression} ILIKE ${'%' + normalized}` as any);
      case 'notContains':
        return query.where(sql`${sqlExpression} NOT ILIKE ${'%' + normalized + '%'}` as any);
      case 'notEquals':
        return query.where(sql`${sqlExpression} NOT ILIKE ${normalized}` as any);
      case 'isEmpty':
        return query.where(sql`${sqlExpression} IS NULL OR ${sqlExpression} = ''` as any);
      case 'isNotEmpty':
        return query.where(sql`${sqlExpression} IS NOT NULL AND ${sqlExpression} != ''` as any);
      case 'contains':
      default:
        return query.where(sql`${sqlExpression} ILIKE ${'%' + normalized + '%'}` as any);
    }
  }

  protected normalizeSearch(raw: string | null | undefined): string | undefined {
    if (!raw || !raw.trim()) return undefined;
    const lower = raw.trim().toLowerCase().replace(/\*/g, '%');
    return `%${lower}%`;
  }

  protected getDelete(trx?: Transaction<Models>): DeleteQueryBuilder<Models, T, DeleteResult> {
    return (trx
      ? trx.deleteFrom(this.table)
      : BaseRepository._db.deleteFrom(this.table)) as unknown as DeleteQueryBuilder<Models, T, DeleteResult>;
  }

  protected getInsert(trx?: Transaction<Models>): InsertQueryBuilder<Models, T, InsertResult> {
    return trx ? trx.insertInto(this.table) : BaseRepository._db.insertInto(this.table);
  }

  protected getSelect(trx?: Transaction<Models>): SelectQueryBuilder<Models, T, Selectable<Models[T]>> {
    const ret = trx ? trx.selectFrom(this.table) : BaseRepository._db.selectFrom(this.table);

    return ret as unknown as SelectQueryBuilder<Models, T, Selectable<Models[T]>>;
  }

  protected getSelectWithColumns(options?: QueryParams<T>, trx?: Transaction<Models>) {
    const query = this.getSelect(trx);
    return this.applyOptions(query, options);
  }

  public getUpdate(trx?: Transaction<Models>): UpdateQueryBuilder<Models, T, T, UpdateResult> {
    const ret = trx ? trx.updateTable(this.table) : BaseRepository._db.updateTable(this.table);
    return ret as unknown as UpdateQueryBuilder<Models, T, T, UpdateResult>;
  }

  protected buildRuleExpression(eb: any, column: string, isCast: boolean, op: string, val: any) {
    // Allow users to type * as a wildcard; normalize to SQL %.
    // The operator's own wrapping is always applied — Postgres collapses %% naturally.
    const normalized = String(val ?? '').replace(/\*/g, '%');

    const pattern = op || 'contains';
    switch (pattern) {
      case 'equals':
        return isCast ? sql`${sql.raw(column)} ILIKE ${normalized}` : eb(column, 'ilike', normalized);
      case 'startsWith':
        return isCast ? sql`${sql.raw(column)} ILIKE ${normalized + '%'}` : eb(column, 'ilike', `${normalized}%`);
      case 'endsWith':
        return isCast ? sql`${sql.raw(column)} ILIKE ${'%' + normalized}` : eb(column, 'ilike', `%${normalized}`);
      case 'notContains':
        return isCast
          ? sql`${sql.raw(column)} NOT ILIKE ${'%' + normalized + '%'}`
          : eb(column, 'not ilike', `%${normalized}%`);
      case 'notEquals':
        return isCast ? sql`${sql.raw(column)} NOT ILIKE ${normalized}` : eb(column, 'not ilike', normalized);
      case 'isEmpty':
      case 'empty':
        return isCast
          ? sql`${sql.raw(column)} IS NULL OR ${sql.raw(column)} = ''`
          : eb.or([eb(column, 'is', null), eb(column, '=', '')]);
      case 'isNotEmpty':
      case 'notempty':
        return isCast
          ? sql`${sql.raw(column)} IS NOT NULL AND ${sql.raw(column)} != ''`
          : eb.and([eb(column, 'is not', null), eb(column, '!=', '')]);
      case 'contains':
      default:
        return isCast
          ? sql`${sql.raw(column)} ILIKE ${'%' + normalized + '%'}`
          : eb(column, 'ilike', `%${normalized}%`);
    }
  }

  protected applyAdvancedFilters(
    query: any,
    advancedFilterModel:
      | QueryBuilderGroupNode
      | { conjunction: 'AND' | 'OR'; rules: { field: string; op: string; value: any }[] }
      | undefined,
    columnMapping: Record<string, { col: string; isCast?: boolean }>,
  ) {
    if (!advancedFilterModel) {
      return query;
    }

    const isLegacy = !('kind' in advancedFilterModel) || (advancedFilterModel as any).kind !== 'group';
    let rootGroup: QueryBuilderGroupNode;

    if (isLegacy) {
      const legacyModel = advancedFilterModel as {
        conjunction: 'AND' | 'OR';
        rules: { field: string; op: string; value: any }[];
      };
      if (!Array.isArray(legacyModel.rules) || legacyModel.rules.length === 0) {
        return query;
      }
      rootGroup = {
        kind: 'group',
        id: 'legacy-root',
        conjunction: legacyModel.conjunction,
        rules: legacyModel.rules.map((r, i) => ({
          kind: 'rule',
          id: `legacy-rule-${i}`,
          field: r.field,
          op: r.op,
          value: r.value,
        })),
      };
    } else {
      rootGroup = advancedFilterModel as QueryBuilderGroupNode;
    }

    return query.where((eb: any) => {
      const expression = this.buildGroupExpression(eb, rootGroup, columnMapping);
      return expression || sql`true`;
    });
  }

  private buildGroupExpression(
    eb: any,
    group: QueryBuilderGroupNode,
    columnMapping: Record<string, { col: string; isCast?: boolean }>,
  ): any {
    if (!group.rules || group.rules.length === 0) {
      return null;
    }

    const expressions = group.rules
      .map((node) => {
        if (node.kind === 'rule') {
          const mapping = columnMapping[node.field];
          if (!mapping) return null;

          if (node.op !== 'isEmpty' && node.op !== 'isNotEmpty' && node.op !== 'empty' && node.op !== 'notempty') {
            if (node.value === undefined || node.value === null || String(node.value).trim() === '') {
              return null;
            }
          }

          const mappedOp = node.op === 'eq' ? 'equals' : node.op === 'neq' ? 'notEquals' : node.op;
          return this.buildRuleExpression(eb, mapping.col, !!mapping.isCast, mappedOp, node.value);
        } else {
          return this.buildGroupExpression(eb, node, columnMapping);
        }
      })
      .filter(Boolean);

    if (expressions.length === 0) return null;
    if (expressions.length === 1) return expressions[0];

    return group.conjunction === 'OR' ? eb.or(expressions) : eb.and(expressions);
  }
}

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
  advancedFilterModel?:
    | QueryBuilderGroupNode
    | {
        conjunction: 'AND' | 'OR';
        rules: { field: string; op: string; value: any }[];
      };
};

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

export function ref<TTable extends keyof Models, TColumn extends keyof Models[TTable]>(
  table: TTable,
  column: TColumn,
): ReferenceExpression<Models, TTable> {
  return `${String(table)}.${String(column)}` as ReferenceExpression<Models, TTable>;
}
