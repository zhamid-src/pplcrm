import { ImportsRepo } from '../../imports/repositories/imports.repo';

export class ExportsRepo {
  public readonly db = new ImportsRepo().db;

  public async create(row: {
    tenant_id: string;
    user_id: string;
    entity: string;
    file_name: string;
    columns: string[] | null;
  }) {
    return this.db
      .insertInto('data_exports' as any)
      .values({
        tenant_id: row.tenant_id,
        user_id: row.user_id,
        entity: row.entity,
        file_name: row.file_name,
        status: 'pending',
        columns: row.columns ? JSON.stringify(row.columns) : null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  public async updateStatus(
    id: string,
    tenant_id: string,
    status: 'processing' | 'completed' | 'failed',
    opts?: { rowCount?: number; storageKey?: string; error?: string },
  ) {
    return this.db
      .updateTable('data_exports' as any)
      .set({
        status,
        row_count: opts?.rowCount ?? null,
        storage_key: opts?.storageKey ?? null,
        error: opts?.error ?? null,
        updated_at: new Date(),
      })
      .where('id', '=', id as any)
      .where('tenant_id', '=', tenant_id as any)
      .execute();
  }

  public async list(tenant_id: string) {
    return this.db
      .selectFrom('data_exports' as any)
      .select(['id', 'entity', 'file_name', 'status', 'row_count', 'error', 'created_at', 'updated_at'])
      .where('tenant_id', '=', tenant_id as any)
      .orderBy('created_at', 'desc')
      .limit(50)
      .execute();
  }

  public async getById(id: string, tenant_id: string) {
    return this.db
      .selectFrom('data_exports' as any)
      .selectAll()
      .where('id', '=', id as any)
      .where('tenant_id', '=', tenant_id as any)
      .executeTakeFirst();
  }
}
