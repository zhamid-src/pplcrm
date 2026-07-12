import type { QueryParams } from '../../../lib/base.repo';
import { BaseRepository } from '../../../lib/base.repo';
import type { Transaction } from 'kysely';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class FilesRepo extends BaseRepository<'files'> {
  constructor() {
    super('files');
  }

  public override async getAllWithCounts(
    input: {
      tenant_id: string;
      options?: QueryParams<any> & { entityType?: string; entityId?: string };
    },
    trx?: Transaction<Models>,
  ) {
    const db = trx || this.db;
    let query = db
      .selectFrom('files')
      .leftJoin('authusers as creator', 'creator.id', 'files.uploaded_by')
      .where('files.tenant_id', '=', input.tenant_id);

    if (input.options?.entityType) {
      query = query.where('files.entity_type', '=', input.options.entityType) as any;
    }
    if (input.options?.entityId) {
      query = query.where('files.entity_id', '=', input.options.entityId) as any;
    }

    if (input.options) {
      query = this.applyOptions(query as any, input.options as any) as any;
    } else {
      query = query.orderBy('files.created_at', 'desc') as any;
    }

    const rows = await query
      .select([
        'files.id',
        'files.tenant_id',
        'files.filename',
        'files.mime_type',
        'files.size_bytes',
        'files.storage_key',
        'files.sha256_hex',
        'files.uploaded_by',
        'files.entity_type',
        'files.entity_id',
        'files.created_at',
        'creator.email as creator_email',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name',
      ])
      .execute();

    const mappedRows = rows.map((row: any) => {
      const name = [row.creator_first_name, row.creator_last_name].filter(Boolean).join(' ').trim();
      return {
        id: row.id,
        tenant_id: row.tenant_id,
        filename: row.filename,
        mime_type: row.mime_type,
        size_bytes: row.size_bytes,
        storage_key: row.storage_key,
        sha256_hex: row.sha256_hex,
        uploaded_by: row.uploaded_by,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        created_at: row.created_at,
        updated_at: row.created_at,
        createdBy: row.uploaded_by
          ? {
              id: row.uploaded_by,
              name: name || null,
              email: row.creator_email || null,
            }
          : null,
      };
    });

    return {
      rows: mappedRows,
      count: mappedRows.length,
    };
  }

  public async getTotalBytes(tenantId: string): Promise<number> {
    const row = await this.db
      .selectFrom('files')
      .select(this.db.fn.sum('size_bytes').as('total'))
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    return Number(row?.total || 0);
  }

  public async getLargestFiles(tenantId: string, limit: number) {
    const rows = await this.db
      .selectFrom('files')
      .leftJoin('newsletters', (join) =>
        join.onRef('newsletters.id', '=', 'files.entity_id' as any).on('files.entity_type', '=', 'newsletter'),
      )
      .leftJoin('teams', (join) =>
        join.onRef('teams.id', '=', 'files.entity_id' as any).on('files.entity_type', '=', 'team'),
      )
      .where('files.tenant_id', '=', tenantId)
      .select([
        'files.id',
        'files.filename',
        'files.size_bytes',
        'files.entity_type',
        'files.entity_id',
        'newsletters.subject as newsletter_subject',
        'teams.name as team_name',
      ])
      .orderBy('files.size_bytes', 'desc')
      .limit(limit)
      .execute();

    return rows.map((row: any) => ({
      id: row.id,
      filename: row.filename,
      size_bytes: row.size_bytes,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      attachedToLabel:
        row.entity_type === 'newsletter' && row.newsletter_subject
          ? `"${row.newsletter_subject}" newsletter`
          : row.entity_type === 'team' && row.team_name
            ? `the ${row.team_name} team`
            : null,
    }));
  }
}
