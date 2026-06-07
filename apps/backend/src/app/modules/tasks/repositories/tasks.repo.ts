import { sql, Transaction } from 'kysely';

import { BaseRepository, QueryParams } from '../../../lib/base.repo';
import { Models, OperationDataType } from 'common/src/lib/kysely.models';

export class TasksRepo extends BaseRepository<'tasks'> {
  constructor() {
    super('tasks');
  }

  public async countArchived(tenant_id: string) {
    const res = await this.getSelect()
      .select(({ fn }) => [fn.count<number>('id').as('total')])
      .where('tasks.tenant_id', '=', tenant_id as any)
      .where('tasks.status', '=', 'archived' as any)
      .execute();
    const total = res?.[0]?.['total'] as unknown as number;
    return Number(total || 0);
  }

  public async countExcludingArchived(tenant_id: string) {
    const res = await this.getSelect()
      .select(({ fn }) => [fn.count<number>('id').as('total')])
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '!=', 'archived' as any)
      .execute();
    const total = res?.[0]?.['total'] as unknown as number;
    return Number(total || 0);
  }

  private buildTasksQueryBuilder(tenant_id: string, isArchived: boolean, options?: QueryParams<'tasks'>) {
    const text = this.normalizeSearch((options as any)?.searchStr);
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;
    // Extract priority/assigned_to sort to apply custom ordering
    const pri = options?.sortModel?.find((s) => s.colId === 'priority');
    const ass = options?.sortModel?.find((s) => s.colId === 'assigned_to');
    
    const rest = {
      ...(options || {}),
      sortModel: options?.sortModel?.filter((s) => s.colId !== 'priority' && s.colId !== 'assigned_to'),
    } as QueryParams<'tasks'>;

    const hasAssignedFilter = !!filterModel?.['assigned_to']?.value || typeof filterModel?.['assigned_to'] === 'string';
    const hasCreatedFilter = !!filterModel?.['createdby_id']?.value || typeof filterModel?.['createdby_id'] === 'string';
    const joinAssign = !!ass || !!text || hasAssignedFilter;
    const joinCreator = !!text || hasCreatedFilter;

    const applyGridFilters = <QB extends ReturnType<typeof this.getSelectWithColumns>>(qb: QB) =>
      qb
        .$if(!!filterModel?.['name']?.value, (q) => q.where('tasks.name', 'ilike', `%${filterModel['name'].value}%`))
        .$if(!!filterModel?.['status']?.value, (q) => {
          const raw = (filterModel['status'].value) as any;
          const vals = Array.isArray(raw) ? raw : [raw];
          const norm = vals.map((v) => String(v).trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean);
          return norm.length ? q.where('tasks.status', 'in', norm as any) : q;
        })
        .$if(!!filterModel?.['priority']?.value, (q) => {
          const raw = (filterModel['priority'].value) as any;
          const vals = Array.isArray(raw) ? raw : [raw];
          const norm = vals.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
          return norm.length ? q.where('tasks.priority', 'in', norm as any) : q;
        })
        .$if(!!filterModel?.['due_at']?.value, (q) => q.where(sql`CAST(tasks.due_at AS TEXT) ILIKE ${'%' + filterModel['due_at'].value + '%'}` as any))
        .$if(!!hasAssignedFilter, (q) => {
          const raw = (filterModel['assigned_to']?.value ?? filterModel['assigned_to']) as any;
          const arr = Array.isArray(raw) ? raw : [raw];
          const parts = arr
            .map((v) => String(v || '').trim())
            .filter(Boolean)
            .map((val) => {
              const low = val.toLowerCase();
              const isNull = low === 'not assigned' || low === 'unassigned';
              if (isNull) return sql`tasks.assigned_to IS NULL` as any;
              const isNumeric = /^\d+$/.test(val);
              if (isNumeric)
                return sql`(
                  COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '') ILIKE ${'%' + val + '%'} OR
                  tasks.assigned_to = ${Number(val)}
                )` as any;
              return sql`COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '') ILIKE ${'%' + val + '%'}` as any;
            });
          if (!parts.length) return q;
          const orExpr = parts.reduce((acc: any, cur: any, idx: number) => (idx === 0 ? cur : sql`${acc} OR ${cur}`), parts[0]);
          return q.where(sql`(${orExpr})` as any);
        })
        .$if(!!hasCreatedFilter, (q) => {
          const raw = (filterModel['createdby_id']?.value ?? filterModel['createdby_id']) as any;
          const arr = Array.isArray(raw) ? raw : [raw];
          const parts = arr
            .map((v) => String(v || '').trim())
            .filter(Boolean)
            .map((val) => {
              const isNumeric = /^\d+$/.test(val);
              if (isNumeric)
                return sql`(
                  COALESCE(au_created.first_name || ' ' || au_created.last_name, '') ILIKE ${'%' + val + '%'} OR
                  tasks.createdby_id = ${Number(val)}
                )` as any;
              return sql`COALESCE(au_created.first_name || ' ' || au_created.last_name, '') ILIKE ${'%' + val + '%'}` as any;
            });
          if (!parts.length) return q;
          const orExpr2 = parts.reduce((acc: any, cur: any, idx: number) => (idx === 0 ? cur : sql`${acc} OR ${cur}`), parts[0]);
          return q.where(sql`(${orExpr2})` as any);
        })
        .$if(!!filterModel?.['team_id']?.value, (q) => q.where('tasks.team_id', '=', filterModel['team_id'].value as any));

    return applyGridFilters(this.getSelectWithColumns(rest))
      .$if(joinAssign, (qb) => qb.leftJoin('authusers as au_assign', 'au_assign.id', 'tasks.assigned_to'))
      .$if(joinCreator, (qb) => qb.leftJoin('authusers as au_created', 'au_created.id', 'tasks.createdby_id'))
      .leftJoin('teams', 'teams.id', 'tasks.team_id')
      .select('teams.name as team_name')
      .where('tasks.tenant_id', '=', tenant_id as any)
      .where('tasks.status', isArchived ? '=' : '!=', 'archived' as any)
      .$if(!!text, (qb) =>
        qb.where(
          sql`(
            LOWER(tasks.name) LIKE ${text} OR
            LOWER(COALESCE(tasks.details, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.status, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.priority, '')) LIKE ${text} OR
            LOWER(COALESCE(teams.name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_assign.first_name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_assign.last_name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_created.first_name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_created.last_name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_created.first_name || ' ' || au_created.last_name, '')) LIKE ${text}
          )` as any,
        ),
      )
      .$if(!!pri, (qb) =>
        qb.orderBy(
          sql`CASE tasks.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`,
          (pri as any).sort,
        ),
      )
      .$if(!!ass, (qb) => qb.orderBy(sql`COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '')`, (ass as any).sort));
  }

  public async getAllArchived(tenant_id: string, options?: QueryParams<'tasks'>) {
    return this.buildTasksQueryBuilder(tenant_id, true, options).execute();
  }

  public async getAllArchivedWithCount(tenant_id: string, options?: QueryParams<'tasks'>) {
    const rows = await this.buildTasksQueryBuilder(tenant_id, true, options)
      .select(() => [sql<number>`count(*) over()`.as('total')])
      .execute();
    const count = Number((rows as any)?.[0]?.total ?? 0);
    rows?.forEach?.((r) => delete (r as any).total);
    return { rows, count } as { rows: any[]; count: number };
  }

  public async getAllExcludingArchived(tenant_id: string, options?: QueryParams<'tasks'>) {
    return this.buildTasksQueryBuilder(tenant_id, false, options).execute();
  }

  public async getAllExcludingArchivedWithCount(tenant_id: string, options?: QueryParams<'tasks'>) {
    const rows = await this.buildTasksQueryBuilder(tenant_id, false, options)
      .select(() => [sql<number>`count(*) over()`.as('total')])
      .execute();
    const count = Number((rows as any)?.[0]?.total ?? 0);
    rows?.forEach?.((r) => delete (r as any).total);
    return { rows, count };
  }

  public async getIdsByFileId(
    input: { tenant_id: string; file_id: string },
    trx?: Transaction<Models>,
  ): Promise<string[]> {
    if (!input.file_id) return [];
    const rows = await this.getSelect(trx)
      .select('id')
      .where('tenant_id', '=', input.tenant_id)
      .where('file_id', '=', input.file_id)
      .execute();
    return rows.map((row) => (row.id != null ? String(row.id) : '')).filter((id) => id.length > 0);
  }

  public async clearFileIdForImport(
    input: { tenant_id: string; import_id: string; user_id: string },
    trx?: Transaction<Models>,
  ) {
    await this.getUpdate(trx)
      .set({
        file_id: null,
        updated_at: sql`now()` as any,
        updatedby_id: input.user_id,
      } as OperationDataType<'tasks', 'update'>)
      .where('tenant_id', '=', input.tenant_id as any)
      .where('file_id', '=', input.import_id as any)
      .executeTakeFirst();
  }
}
