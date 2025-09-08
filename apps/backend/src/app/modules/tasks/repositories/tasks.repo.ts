import { sql } from 'kysely';

import { BaseRepository, QueryParams } from '../../../lib/base.repo';

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

  public async getAllArchived(tenant_id: string, options?: QueryParams<'tasks'>) {
    const searchStr = (options as any)?.searchStr?.toLowerCase?.();
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;
    const text = searchStr ? `%${searchStr}%` : undefined;
    // Extract priority sort to apply custom ordering
    const pri = options?.sortModel?.find((s) => s.colId === 'priority');
    const ass = options?.sortModel?.find((s) => s.colId === 'assigned_to');
    // If searching, we also need creator join to match by creator name
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
          const sv = String(filterModel['status'].value).trim().toLowerCase().replace(/\s+/g, '_');
          return q.where('tasks.status', '=', sv as any);
        })
        .$if(!!filterModel?.['priority']?.value, (q) => {
          const pv = String(filterModel['priority'].value).trim().toLowerCase();
          return q.where('tasks.priority', '=', pv as any);
        })
        .$if(!!filterModel?.['due_at']?.value, (q) => q.where(sql`CAST(tasks.due_at AS TEXT) ILIKE ${'%' + filterModel['due_at'].value + '%'}` as any))
        .$if(!!hasAssignedFilter, (q) => {
          const raw = (filterModel['assigned_to']?.value ?? filterModel['assigned_to']) as any;
          const val = String(raw || '').trim();
          if (!val) return q;
          const low = val.toLowerCase();
          const isNull = low === 'not assigned' || low === 'unassigned';
          if (isNull) return q.where(sql`tasks.assigned_to IS NULL` as any);
          const isNumeric = /^\d+$/.test(val);
          if (isNumeric) {
            return q.where(
              sql`(
                COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '') ILIKE ${'%' + val + '%'} OR
                tasks.assigned_to = ${Number(val)}
              )` as any,
            );
          }
          return q.where(
            sql`COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '') ILIKE ${'%' + val + '%'}` as any,
          );
        })
        .$if(!!hasCreatedFilter, (q) => {
          const raw = (filterModel['createdby_id']?.value ?? filterModel['createdby_id']) as any;
          const val = String(raw || '').trim();
          if (!val) return q;
          const isNumeric = /^\d+$/.test(val);
          if (isNumeric) {
            return q.where(
              sql`(
                COALESCE(au_created.first_name || ' ' || au_created.last_name, '') ILIKE ${'%' + val + '%'} OR
                tasks.createdby_id = ${Number(val)}
              )` as any,
            );
          }
          return q.where(
            sql`COALESCE(au_created.first_name || ' ' || au_created.last_name, '') ILIKE ${'%' + val + '%'}` as any,
          );
        })
    return applyGridFilters(this.getSelectWithColumns(rest))
      .$if(joinAssign, (qb) => qb.leftJoin('authusers as au_assign', 'au_assign.id', 'tasks.assigned_to'))
      .$if(joinCreator, (qb) => qb.leftJoin('authusers as au_created', 'au_created.id', 'tasks.createdby_id'))
      .where('tasks.tenant_id', '=', tenant_id as any)
      .where('tasks.status', '=', 'archived' as any)
      .$if(!!text, (qb) =>
        qb.where(
          sql`(
            LOWER(tasks.name) LIKE ${text} OR
            LOWER(COALESCE(tasks.details, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.status, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.priority, '')) LIKE ${text} OR
            LOWER(COALESCE(au_assign.first_name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_assign.last_name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_created.first_name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_created.last_name, '')) LIKE ${text} OR
            LOWER(COALESCE(au_created.first_name || ' ' || au_created.last_name, '')) LIKE ${text}
          )` as any,
        ),
      )
      // Apply custom priority order if requested
      .$if(!!pri, (qb) =>
        qb.orderBy(
          sql`CASE tasks.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`,
          (pri as any).sort,
        ),
      )
      // Apply assigned_to by display name if requested
      .$if(!!ass, (qb) => qb.orderBy(sql`COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '')`, (ass as any).sort))
      .execute();
  }

  public async getAllArchivedWithCount(tenant_id: string, options?: QueryParams<'tasks'>) {
    const searchStr = (options as any)?.searchStr?.toLowerCase?.();
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;
    const text = searchStr ? `%${searchStr}%` : undefined;
    const pri = options?.sortModel?.find((s) => s.colId === 'priority');
    const ass = options?.sortModel?.find((s) => s.colId === 'assigned_to');
    const rest = {
      ...(options || {}),
      sortModel: options?.sortModel?.filter((s) => s.colId !== 'priority' && s.colId !== 'assigned_to'),
    } as QueryParams<'tasks'>;

    const hasAssignedFilter = !!filterModel?.['assigned_to']?.value || typeof filterModel?.['assigned_to'] === 'string';
    const hasCreatedFilter = !!filterModel?.['createdby_id']?.value || typeof filterModel?.['createdby_id'] === 'string';
    const joinAssign2 = !!ass || !!text || hasAssignedFilter;
    const joinCreator2 = !!text || hasCreatedFilter;
    const applyGridFilters = <QB extends ReturnType<typeof this.getSelectWithColumns>>(qb: QB) =>
      qb
        .$if(!!filterModel?.['name']?.value, (q) => q.where('tasks.name', 'ilike', `%${filterModel['name'].value}%`))
        .$if(!!filterModel?.['status']?.value, (q) => {
          const sv = String(filterModel['status'].value).trim().toLowerCase().replace(/\s+/g, '_');
          return q.where('tasks.status', '=', sv as any);
        })
        .$if(!!filterModel?.['priority']?.value, (q) => {
          const pv = String(filterModel['priority'].value).trim().toLowerCase();
          return q.where('tasks.priority', '=', pv as any);
        })
        .$if(!!filterModel?.['due_at']?.value, (q) => q.where(sql`CAST(tasks.due_at AS TEXT) ILIKE ${'%' + filterModel['due_at'].value + '%'}` as any))
        .$if(!!hasAssignedFilter, (q) => {
          const raw = (filterModel['assigned_to']?.value ?? filterModel['assigned_to']) as any;
          const val = String(raw || '').trim();
          if (!val) return q;
          const low = val.toLowerCase();
          const isNull = low === 'not assigned' || low === 'unassigned';
          if (isNull) return q.where(sql`tasks.assigned_to IS NULL` as any);
          const isNumeric = /^\d+$/.test(val);
          if (isNumeric) {
            return q.where(
              sql`(
                COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '') ILIKE ${'%' + val + '%'} OR
                tasks.assigned_to = ${Number(val)}
              )` as any,
            );
          }
          return q.where(
            sql`COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '') ILIKE ${'%' + val + '%'}` as any,
          );
        })
        .$if(!!hasCreatedFilter, (q) => {
          const raw = (filterModel['createdby_id']?.value ?? filterModel['createdby_id']) as any;
          const val = String(raw || '').trim();
          if (!val) return q;
          const isNumeric = /^\d+$/.test(val);
          if (isNumeric) {
            return q.where(
              sql`(
                COALESCE(au_created.first_name || ' ' || au_created.last_name, '') ILIKE ${'%' + val + '%'} OR
                tasks.createdby_id = ${Number(val)}
              )` as any,
            );
          }
          return q.where(
            sql`COALESCE(au_created.first_name || ' ' || au_created.last_name, '') ILIKE ${'%' + val + '%'}` as any,
          );
        })
    const rows = await applyGridFilters(this.getSelectWithColumns(rest))
      .$if(joinAssign2, (qb) => qb.leftJoin('authusers as au_assign', 'au_assign.id', 'tasks.assigned_to'))
      .$if(joinCreator2, (qb) => qb.leftJoin('authusers as au_created', 'au_created.id', 'tasks.createdby_id'))
      .select(() => [sql<number>`count(*) over()`.as('total')])
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '=', 'archived' as any)
      .$if(!!text, (qb) =>
        qb.where(
          sql`(
            LOWER(tasks.name) LIKE ${text} OR
            LOWER(COALESCE(tasks.details, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.status, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.priority, '')) LIKE ${text} OR
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
      .$if(!!ass, (qb) => qb.orderBy(sql`COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '')`, (ass as any).sort))
      .execute();

    const count = Number((rows as any)?.[0]?.total ?? 0);
    rows?.forEach?.((r) => delete (r as any).total);
    return { rows, count } as { rows: any[]; count: number };
  }

  public async getAllExcludingArchived(tenant_id: string, options?: QueryParams<'tasks'>) {
    const searchStr = (options as any)?.searchStr?.toLowerCase?.();
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;
    const text = searchStr ? `%${searchStr}%` : undefined;
    const pri = options?.sortModel?.find((s) => s.colId === 'priority');
    const ass = options?.sortModel?.find((s) => s.colId === 'assigned_to');
    const rest = {
      ...(options || {}),
      sortModel: options?.sortModel?.filter((s) => s.colId !== 'priority' && s.colId !== 'assigned_to'),
    } as QueryParams<'tasks'>;
    const hasAssignedFilter = !!filterModel?.['assigned_to']?.value || typeof filterModel?.['assigned_to'] === 'string';
    const hasCreatedFilter = !!filterModel?.['createdby_id']?.value || typeof filterModel?.['createdby_id'] === 'string';
    const joinAssign3 = !!ass || !!text || hasAssignedFilter;
    const joinCreator3 = !!text || hasCreatedFilter;
    const applyGridFilters = <QB extends ReturnType<typeof this.getSelectWithColumns>>(qb: QB) =>
      qb
        .$if(!!filterModel?.['name']?.value, (q) => q.where('tasks.name', 'ilike', `%${filterModel['name'].value}%`))
        .$if(!!filterModel?.['status']?.value, (q) => {
          const sv = String(filterModel['status'].value).trim().toLowerCase().replace(/\s+/g, '_');
          return q.where('tasks.status', '=', sv as any);
        })
        .$if(!!filterModel?.['priority']?.value, (q) => {
          const pv = String(filterModel['priority'].value).trim().toLowerCase();
          return q.where('tasks.priority', '=', pv as any);
        })
        .$if(!!filterModel?.['due_at']?.value, (q) => q.where(sql`CAST(tasks.due_at AS TEXT) ILIKE ${'%' + filterModel['due_at'].value + '%'}` as any))
        .$if(!!hasAssignedFilter, (q) => {
          const raw = (filterModel['assigned_to']?.value ?? filterModel['assigned_to']) as any;
          const val = String(raw || '').trim();
          if (!val) return q;
          const low = val.toLowerCase();
          const isNull = low === 'not assigned' || low === 'unassigned';
          if (isNull) return q.where(sql`tasks.assigned_to IS NULL` as any);
          const isNumeric = /^\d+$/.test(val);
          if (isNumeric) {
            return q.where(
              sql`(
                COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '') ILIKE ${'%' + val + '%'} OR
                tasks.assigned_to = ${Number(val)}
              )` as any,
            );
          }
          return q.where(
            sql`COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '') ILIKE ${'%' + val + '%'}` as any,
          );
        })
        .$if(!!hasCreatedFilter, (q) => {
          const raw = (filterModel['createdby_id']?.value ?? filterModel['createdby_id']) as any;
          const val = String(raw || '').trim();
          if (!val) return q;
          const isNumeric = /^\d+$/.test(val);
          if (isNumeric) {
            return q.where(
              sql`(
                COALESCE(au_created.first_name || ' ' || au_created.last_name, '') ILIKE ${'%' + val + '%'} OR
                tasks.createdby_id = ${Number(val)}
              )` as any,
            );
          }
          return q.where(
            sql`COALESCE(au_created.first_name || ' ' || au_created.last_name, '') ILIKE ${'%' + val + '%'}` as any,
          );
        })
    return applyGridFilters(this.getSelectWithColumns(rest))
      .$if(joinAssign3, (qb) => qb.leftJoin('authusers as au_assign', 'au_assign.id', 'tasks.assigned_to'))
      .$if(joinCreator3, (qb) => qb.leftJoin('authusers as au_created', 'au_created.id', 'tasks.createdby_id'))
      .where('tasks.tenant_id', '=', tenant_id as any)
      .where('tasks.status', '!=', 'archived' as any)
      .$if(!!text, (qb) =>
        qb.where(
          sql`(
            LOWER(tasks.name) LIKE ${text} OR
            LOWER(COALESCE(tasks.details, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.status, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.priority, '')) LIKE ${text} OR
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
      .$if(!!ass, (qb) => qb.orderBy(sql`COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '')`, (ass as any).sort))
      .execute();
  }

  public async getAllExcludingArchivedWithCount(tenant_id: string, options?: QueryParams<'tasks'>) {
    const searchStr = (options as any)?.searchStr?.toLowerCase?.();
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;
    const text = searchStr ? `%${searchStr}%` : undefined;
    const pri = options?.sortModel?.find((s) => s.colId === 'priority');
    const ass = options?.sortModel?.find((s) => s.colId === 'assigned_to');
    const rest = {
      ...(options || {}),
      sortModel: options?.sortModel?.filter((s) => s.colId !== 'priority' && s.colId !== 'assigned_to'),
    } as QueryParams<'tasks'>;
    const hasAssignedFilter = !!filterModel?.['assigned_to']?.value || typeof filterModel?.['assigned_to'] === 'string';
    const hasCreatedFilter = !!filterModel?.['createdby_id']?.value || typeof filterModel?.['createdby_id'] === 'string';
    const joinAssign4 = !!ass || !!text || hasAssignedFilter;
    const joinCreator4 = !!text || hasCreatedFilter;
    const applyGridFilters = <QB extends ReturnType<typeof this.getSelectWithColumns>>(qb: QB) =>
      qb
        .$if(!!filterModel?.['name']?.value, (q) => q.where('tasks.name', 'ilike', `%${filterModel['name'].value}%`))
        .$if(!!filterModel?.['status']?.value, (q) => {
          const sv = String(filterModel['status'].value).trim().toLowerCase().replace(/\s+/g, '_');
          return q.where('tasks.status', '=', sv as any);
        })
        .$if(!!filterModel?.['priority']?.value, (q) => {
          const pv = String(filterModel['priority'].value).trim().toLowerCase();
          return q.where('tasks.priority', '=', pv as any);
        })
        .$if(!!filterModel?.['due_at']?.value, (q) => q.where(sql`CAST(tasks.due_at AS TEXT) ILIKE ${'%' + filterModel['due_at'].value + '%'}` as any))
        .$if(!!hasAssignedFilter, (q) => {
          const raw = (filterModel['assigned_to']?.value ?? filterModel['assigned_to']) as any;
          const val = String(raw || '').trim();
          if (!val) return q;
          const low = val.toLowerCase();
          const isNull = low === 'not assigned' || low === 'unassigned';
          if (isNull) return q.where(sql`tasks.assigned_to IS NULL` as any);
          const isNumeric = /^\d+$/.test(val);
          if (isNumeric) {
            return q.where(
              sql`(
                COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '') ILIKE ${'%' + val + '%'} OR
                tasks.assigned_to = ${Number(val)}
              )` as any,
            );
          }
          return q.where(
            sql`COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '') ILIKE ${'%' + val + '%'}` as any,
          );
        })
        .$if(!!hasCreatedFilter, (q) => {
          const raw = (filterModel['createdby_id']?.value ?? filterModel['createdby_id']) as any;
          const val = String(raw || '').trim();
          if (!val) return q;
          const isNumeric = /^\d+$/.test(val);
          if (isNumeric) {
            return q.where(
              sql`(
                COALESCE(au_created.first_name || ' ' || au_created.last_name, '') ILIKE ${'%' + val + '%'} OR
                tasks.createdby_id = ${Number(val)}
              )` as any,
            );
          }
          return q.where(
            sql`COALESCE(au_created.first_name || ' ' || au_created.last_name, '') ILIKE ${'%' + val + '%'}` as any,
          );
        })
    const rows = await applyGridFilters(this.getSelectWithColumns(rest))
      .$if(joinAssign4, (qb) => qb.leftJoin('authusers as au_assign', 'au_assign.id', 'tasks.assigned_to'))
      .$if(joinCreator4, (qb) => qb.leftJoin('authusers as au_created', 'au_created.id', 'tasks.createdby_id'))
      .select(() => [sql<number>`count(*) over()`.as('total')])
      .where('tasks.tenant_id', '=', tenant_id as any)
      .where('tasks.status', '!=', 'archived' as any)
      .$if(!!text, (qb) =>
        qb.where(
          sql`(
            LOWER(tasks.name) LIKE ${text} OR
            LOWER(COALESCE(tasks.details, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.status, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.priority, '')) LIKE ${text} OR
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
      .$if(!!ass, (qb) => qb.orderBy(sql`COALESCE(au_assign.first_name || ' ' || au_assign.last_name, '')`, (ass as any).sort))
      .execute();

    const count = Number((rows as any)?.[0]?.total ?? 0);
    rows?.forEach?.((r) => delete (r as any).total);
    return { rows, count };
  }
}
