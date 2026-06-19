import { BaseRepository, QueryParams } from '../../../lib/base.repo';
import { Transaction } from 'kysely';
import { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class FilesRepo extends BaseRepository<'files'> {
  constructor() {
    super('files');
  }

  public override async getAllWithCounts(
    input: {
      tenant_id: string;
      options?: QueryParams<any>;
    },
    trx?: Transaction<Models>,
  ) {
    const db = trx || this.db;
    let query = db
      .selectFrom('files')
      .leftJoin('authusers as creator', 'creator.id', 'files.uploaded_by')
      .where('files.tenant_id', '=', input.tenant_id);

    if (input.options) {
      query = this.applyOptions(query as any, input.options) as any;
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
}
