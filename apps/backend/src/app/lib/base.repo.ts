// tsco:ignore

import type { INow, QueryBuilderGroupNode } from '../../../../../libs/common/src';

import type {
  DeleteQueryBuilder,
  DeleteResult,
  InsertQueryBuilder,
  InsertResult,
  OperandValueExpressionOrList,
  OrderByExpression,
  QueryResult,
  ReferenceExpression,
  SelectExpression,
  SelectQueryBuilder,
  Selectable,
  Transaction,
  UpdateObject,
  UpdateQueryBuilder,
  UpdateResult,
} from 'kysely';
import { CompiledQuery, Kysely, PostgresDialect, sql } from 'kysely';

import type {
  Models,
  OperationDataType,
  TypeId,
  TypeTableColumns,
  TypeTenantId,
} from '../../../../../libs/common/src/lib/kysely.models';
import { Pool } from 'pg';
import { env } from '../../env';
import { currentTenantId } from './tenant-context';
import Cursor from 'pg-cursor';

// S-1 (schema review 2026-07-06 §6): the tenant id is a bigint stored as a
// string; only digits are ever a legal value. We build the set_config call with
// a bound parameter (never string-interpolated), but still validate here so a
// corrupt context can never smuggle SQL or a non-numeric GUC into the session.
const TENANT_ID_PATTERN = /^\d+$/;

const dialect = new PostgresDialect({
  // P-4 (schema review 2026-07-06, §5): make the pool explicit instead of pg's
  // silent defaults (max 10, no timeouts). Without a connection timeout, a burst
  // of traffic plus a batch of jobs queues on the pool forever; without an
  // application_name, pool traffic is invisible in pg_stat_activity.
  pool: new Pool({
    ...env.db,
    max: env.dbPoolMax,
    connectionTimeoutMillis: 5_000, // fail fast rather than queue forever
    idleTimeoutMillis: 30_000,
    application_name: 'pplcrm-api',
  }),
  cursor: Cursor,
  // S-1: stamp the current async-context tenant onto every reserved connection
  // so Postgres RLS policies scope the query. Runs on *every* checkout (standalone
  // queries and transactions alike). An empty value means "unscoped" — the RLS
  // policy then allows all rows, which is what pre-auth and background-job paths
  // need. is_local=false so it survives the whole checkout; the next checkout
  // always overwrites it, so a pooled connection can never carry a stale tenant.
  onReserveConnection: async (connection) => {
    const tenantId = currentTenantId();
    const safe = TENANT_ID_PATTERN.test(tenantId) ? tenantId : '';
    await connection.executeQuery(CompiledQuery.raw(`select set_config('app.tenant_id', $1, false)`, [safe]));
  },
});

type ColName<TB extends keyof Models> = keyof Models[TB] & string;

export class BaseRepository<T extends keyof Models> {
  private static _db = new Kysely<Models>({ dialect });

  public static get dbInstance(): Kysely<Models> {
    return BaseRepository._db;
  }

  protected readonly table: T;

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
    const first = results[0];
    if (!first) {
      throw new Error(`Insert into "${this.table}" returned no rows`);
    }
    return first;
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
      .where('tenant_id', '=', input.row.tenant_id as OperandValueExpressionOrList<Models, T, 'tenant_id'>)
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
      options?: any;
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: Record<string, any>[]; count: number }> {
    // `count` must be the total matching-rows count, NOT rows.length — getAll applies
    // limit/offset (via startRow/endRow), so rows.length is just the current page size
    // and would break server-side grid pagination. The base getAll filters only by
    // tenant_id, so the tenant-wide count() is the correct total here. (Entities that
    // add server-side filters, e.g. persons/households/companies, override this method
    // with a count query that mirrors their WHERE clause.)
    const [rows, count] = await Promise.all([
      this.getAll({ tenant_id: input.tenant_id, options: input.options as QueryParams<T> }, trx),
      this.count(input.tenant_id, trx),
    ]);
    return { rows: rows as Record<string, any>[], count };
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

  public getOneById(input: { tenant_id: TypeTenantId<T>; id: string }, trx?: Transaction<Models>) {
    let query = this.getSelectWithColumns(undefined, trx).where(
      'id' as ReferenceExpression<Models, T>,
      '=',
      input.id as TypeId<T>,
    );
    if (this.table !== 'tenants') {
      query = query.where('tenant_id' as ReferenceExpression<Models, T>, '=', input.tenant_id);
    }
    return query.executeTakeFirst();
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
      .set(input.row as unknown as UpdateObject<Models, T, T>)
      .where('id' as ReferenceExpression<Models, T>, '=', input.id);
    if (this.table !== 'tenants') {
      query = query.where('tenant_id' as ReferenceExpression<Models, T>, '=', input.tenant_id);
    }
    return query.returningAll().executeTakeFirst();
  }

  protected applyOptions(query: SelectQueryBuilder<Models, T, unknown>, options?: QueryParams<T>) {
    const opts = options ?? {};
    query = options?.columns
      ? query.select(
          options.columns.map((c) => {
            if (typeof c === 'string' && !c.includes('.')) {
              return `${String(this.table)}.${c}` as SelectExpression<Models, T>;
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

    const finalLimit = hasLimit ? options?.limit : derivedLimit;
    const finalOffset = hasOffset ? options?.offset : derivedOffset;

    query = typeof finalLimit === 'number' ? query.limit(finalLimit) : query;
    query = typeof finalOffset === 'number' ? query.offset(finalOffset) : query;

    // Map generic sortModel (from UI) to orderBy clauses when provided
    if (opts.sortModel && Array.isArray(opts.sortModel) && opts.sortModel.length > 0) {
      query = opts.sortModel.reduce((acc: typeof query, sort: { colId: string; sort: 'asc' | 'desc' }) => {
        const direction: 'asc' | 'desc' = sort.sort === 'desc' ? 'desc' : 'asc';
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
        // Skip dotted references that weren't resolved to a known table.column
        if (typeof col === 'string' && col.includes('.') && !col.startsWith(`${String(this.table)}.`)) {
          return acc;
        }
        // Defense-in-depth: only a safe SQL identifier (optionally table.column)
        // may reach orderBy. Anything else from the client sortModel is dropped.
        if (typeof col !== 'string' || !/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$/i.test(col)) {
          return acc;
        }
        return acc.orderBy(col as ReferenceExpression<Models, T>, direction);
      }, query);
    }
    query = options?.orderBy ? query.orderBy(options.orderBy) : query;
    query = options?.groupBy ? query.groupBy(options.groupBy as any) : query;
    return query;
  }

  protected applyColumnFilter(query: any, column: string, filter: { op?: string; value?: unknown }) {
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

  protected applyCastColumnFilter(
    query: any,
    sqlExpression: ReturnType<typeof sql>,
    filter: { op?: string; value?: unknown },
  ) {
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
        return query.where(sql<boolean>`${sqlExpression} ILIKE ${normalized}`);
      case 'startsWith':
        return query.where(sql<boolean>`${sqlExpression} ILIKE ${normalized + '%'}`);
      case 'endsWith':
        return query.where(sql<boolean>`${sqlExpression} ILIKE ${'%' + normalized}`);
      case 'notContains':
        return query.where(sql<boolean>`${sqlExpression} NOT ILIKE ${'%' + normalized + '%'}`);
      case 'notEquals':
        return query.where(sql<boolean>`${sqlExpression} NOT ILIKE ${normalized}`);
      case 'isEmpty':
        return query.where(sql<boolean>`${sqlExpression} IS NULL OR ${sqlExpression} = ''`);
      case 'isNotEmpty':
        return query.where(sql<boolean>`${sqlExpression} IS NOT NULL AND ${sqlExpression} != ''`);
      case 'contains':
      default:
        return query.where(sql<boolean>`${sqlExpression} ILIKE ${'%' + normalized + '%'}`);
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

  // SECURITY (S-8, schema review 2026-07-06): `column` is interpolated verbatim via
  // sql.raw() and MUST NEVER contain client input. Callers resolve it from a
  // server-side columnMapping allow-list (see applyAdvancedFilters); a client's
  // raw field string is only ever used as a lookup key into that map, never passed
  // here directly. Filter *values* are always bound parameters. Preserve this
  // invariant when adding call sites.
  protected buildRuleExpression(eb: any, column: string, isCast: boolean, op: string, val: unknown) {
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
      | { conjunction: 'AND' | 'OR'; rules: { field: string; op: string; value: unknown }[] }
      | undefined,
    columnMapping: Record<string, { col: string; isCast?: boolean }>,
  ) {
    if (!advancedFilterModel) {
      return query;
    }

    const isLegacy = !('kind' in advancedFilterModel) || (advancedFilterModel as { kind: unknown }).kind !== 'group';
    let rootGroup: QueryBuilderGroupNode;

    if (isLegacy) {
      const legacyModel = advancedFilterModel as {
        conjunction: 'AND' | 'OR';
        rules: { field: string; op: string; value: unknown }[];
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
        rules: { field: string; op: string; value: unknown }[];
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
