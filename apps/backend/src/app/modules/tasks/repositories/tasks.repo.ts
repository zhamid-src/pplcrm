import { sql } from 'kysely';

import { BaseRepository, QueryParams } from '../../../lib/base.repo';

export class TasksRepo extends BaseRepository<'tasks'> {
  constructor() {
    super('tasks');
  }

  public async countArchived(tenant_id: string) {
    const res = await this.getSelect()
      .select(({ fn }) => [fn.count<number>('id').as('total')])
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '=', 'archived' as any)
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
    const text = searchStr ? `%${searchStr}%` : undefined;
    // Extract priority sort to apply custom ordering
    const pri = options?.sortModel?.find((s) => s.colId === 'priority');
    const rest = {
      ...(options || {}),
      sortModel: options?.sortModel?.filter((s) => s.colId !== 'priority'),
    } as QueryParams<'tasks'>;

    return this.getSelectWithColumns(rest)
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '=', 'archived' as any)
      .$if(!!text, (qb) =>
        qb.where(
          sql`(
            LOWER(tasks.name) LIKE ${text} OR
            LOWER(COALESCE(tasks.details, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.status, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.priority, '')) LIKE ${text}
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
      .execute();
  }

  public async getAllArchivedWithCount(tenant_id: string, options?: QueryParams<'tasks'>) {
    const searchStr = (options as any)?.searchStr?.toLowerCase?.();
    const text = searchStr ? `%${searchStr}%` : undefined;
    const pri = options?.sortModel?.find((s) => s.colId === 'priority');
    const rest = {
      ...(options || {}),
      sortModel: options?.sortModel?.filter((s) => s.colId !== 'priority'),
    } as QueryParams<'tasks'>;

    const rows = await this.getSelectWithColumns(rest)
      .select(() => [sql<number>`count(*) over()`.as('total')])
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '=', 'archived' as any)
      .$if(!!text, (qb) =>
        qb.where(
          sql`(
            LOWER(tasks.name) LIKE ${text} OR
            LOWER(COALESCE(tasks.details, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.status, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.priority, '')) LIKE ${text}
          )` as any,
        ),
      )
      .$if(!!pri, (qb) =>
        qb.orderBy(
          sql`CASE tasks.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`,
          (pri as any).sort,
        ),
      )
      .execute();

    const count = Number((rows as any)?.[0]?.total ?? 0);
    rows?.forEach?.((r) => delete (r as any).total);
    return { rows, count } as { rows: any[]; count: number };
  }

  public async getAllExcludingArchived(tenant_id: string, options?: QueryParams<'tasks'>) {
    const searchStr = (options as any)?.searchStr?.toLowerCase?.();
    const text = searchStr ? `%${searchStr}%` : undefined;
    const pri = options?.sortModel?.find((s) => s.colId === 'priority');
    const rest = {
      ...(options || {}),
      sortModel: options?.sortModel?.filter((s) => s.colId !== 'priority'),
    } as QueryParams<'tasks'>;
    return this.getSelectWithColumns(rest)
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '!=', 'archived' as any)
      .$if(!!text, (qb) =>
        qb.where(
          sql`(
            LOWER(tasks.name) LIKE ${text} OR
            LOWER(COALESCE(tasks.details, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.status, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.priority, '')) LIKE ${text}
          )` as any,
        ),
      )
      .$if(!!pri, (qb) =>
        qb.orderBy(
          sql`CASE tasks.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`,
          (pri as any).sort,
        ),
      )
      .execute();
  }

  public async getAllExcludingArchivedWithCount(tenant_id: string, options?: QueryParams<'tasks'>) {
    const searchStr = (options as any)?.searchStr?.toLowerCase?.();
    const text = searchStr ? `%${searchStr}%` : undefined;
    const pri = options?.sortModel?.find((s) => s.colId === 'priority');
    const rest = {
      ...(options || {}),
      sortModel: options?.sortModel?.filter((s) => s.colId !== 'priority'),
    } as QueryParams<'tasks'>;
    const rows = await this.getSelectWithColumns(rest)
      .select(() => [sql<number>`count(*) over()`.as('total')])
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '!=', 'archived' as any)
      .$if(!!text, (qb) =>
        qb.where(
          sql`(
            LOWER(tasks.name) LIKE ${text} OR
            LOWER(COALESCE(tasks.details, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.status, '')) LIKE ${text} OR
            LOWER(COALESCE(tasks.priority, '')) LIKE ${text}
          )` as any,
        ),
      )
      .$if(!!pri, (qb) =>
        qb.orderBy(
          sql`CASE tasks.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`,
          (pri as any).sort,
        ),
      )
      .execute();

    const count = Number((rows as any)?.[0]?.total ?? 0);
    rows?.forEach?.((r) => delete (r as any).total);
    return { rows, count };
  }
}
