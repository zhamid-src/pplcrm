import { ImportsRepo } from '../../imports/repositories/imports.repo';
import { sql } from 'kysely';

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
      .insertInto('data_exports')
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

  public async createCompleted(row: {
    tenant_id: string;
    user_id: string;
    entity: string;
    file_name: string;
    row_count: number;
  }) {
    return this.db
      .insertInto('data_exports')
      .values({
        tenant_id: row.tenant_id,
        user_id: row.user_id,
        entity: row.entity,
        file_name: row.file_name,
        status: 'completed',
        row_count: row.row_count,
        columns: null,
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
      .updateTable('data_exports')
      .set({
        status,
        row_count: opts?.rowCount ?? null,
        storage_key: opts?.storageKey ?? null,
        error: opts?.error ?? null,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('tenant_id', '=', tenant_id)
      .execute();
  }

  public async list(tenant_id: string) {
    return this.db
      .selectFrom('data_exports')
      .leftJoin('authusers as creator', 'creator.id', 'data_exports.user_id')
      .select([
        'data_exports.id',
        'data_exports.entity',
        'data_exports.file_name',
        'data_exports.status',
        'data_exports.row_count',
        'data_exports.error',
        'data_exports.created_at',
        'data_exports.updated_at',
        'data_exports.user_id',
        'data_exports.storage_key',
        'creator.email as creator_email',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name',
      ])
      .where('data_exports.tenant_id', '=', tenant_id)
      .orderBy('data_exports.created_at', 'desc')
      .limit(50)
      .execute();
  }

  public async getById(id: string, tenant_id: string) {
    return this.db
      .selectFrom('data_exports')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenant_id)
      .executeTakeFirst();
  }

  public async delete(id: string, tenant_id: string) {
    return this.db.transaction().execute(async (trx) => {
      // 1. Delete matching pending/processing background job
      await trx
        .deleteFrom('background_jobs')
        .where('tenant_id', '=', tenant_id)
        .where(sql`payload->>'type'`, '=', 'export_csv')
        .where(sql`payload->>'export_id'`, '=', id)
        .execute();

      // 2. Delete export record
      return await trx
        .deleteFrom('data_exports')
        .where('id', '=', id)
        .where('tenant_id', '=', tenant_id)
        .returningAll()
        .executeTakeFirst();
    });
  }
}
