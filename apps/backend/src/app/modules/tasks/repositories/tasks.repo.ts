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
    return this.getSelectWithColumns(options)
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '=', 'archived' as any)
      .execute();
  }

  public async getAllArchivedWithCount(tenant_id: string, options?: QueryParams<'tasks'>) {
    const rows = await this.getSelectWithColumns(options)
      .select(() => [sql<number>`count(*) over()`.as('total')])
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '=', 'archived' as any)
      .execute();

    const count = Number((rows as any)?.[0]?.total ?? 0);
    rows?.forEach?.((r) => delete (r as any).total);
    return { rows, count } as { rows: any[]; count: number };
  }

  public async getAllExcludingArchived(tenant_id: string, options?: QueryParams<'tasks'>) {
    return this.getSelectWithColumns(options)
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '!=', 'archived' as any)
      .execute();
  }

  public async getAllExcludingArchivedWithCount(tenant_id: string, options?: QueryParams<'tasks'>) {
    const rows = await this.getSelectWithColumns(options)
      .select(() => [sql<number>`count(*) over()`.as('total')])
      .where('tenant_id', '=', tenant_id as any)
      .where('status', '!=', 'archived' as any)
      .execute();

    const count = Number((rows as any)?.[0]?.total ?? 0);
    rows?.forEach?.((r) => delete (r as any).total);
    return { rows, count };
  }
}
