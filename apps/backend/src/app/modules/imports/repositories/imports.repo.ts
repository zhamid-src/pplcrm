import { Transaction, sql } from 'kysely';

import { BaseRepository } from '../../../lib/base.repo';
import { Models } from 'common/src/lib/kysely.models';

export type DataImportWithStats = {
  id: string;
  tenant_id: string;
  file_name: string;
  source: string;
  tag_name: string | null;
  tag_id: string | null;
  row_count: number;
  inserted_count: number;
  error_count: number;
  skipped_count: number;
  households_created: number;
  processed_at: Date;
  created_at: Date;
  updated_at: Date;
  createdby_id: string;
  updatedby_id: string;
  created_by_email: string | null;
  created_by_name: string | null;
  contact_count: number;
  household_count: number;
  tag_assignment_count: number;
  tag_exists: boolean;
};

export class ImportsRepo extends BaseRepository<'data_imports'> {
  constructor() {
    super('data_imports');
  }

  public async getAllWithStats(input: { tenant_id: string }, trx?: Transaction<Models>) {
    return this.buildStatsQuery(input, trx).execute().then((rows) => rows.map((row) => this.mapRow(row)));
  }

  public async getOneWithStats(input: { tenant_id: string; id: string }, trx?: Transaction<Models>) {
    const rows = await this.buildStatsQuery(input, trx)
      .where('data_imports.id', '=', input.id)
      .limit(1)
      .execute();
    const row = rows.at(0);
    return row ? this.mapRow(row) : null;
  }

  private buildStatsQuery(input: { tenant_id: string }, trx?: Transaction<Models>) {
    const contactCountExpr = sql<number>`(
      SELECT COUNT(1)
      FROM persons
      WHERE persons.tenant_id = ${input.tenant_id}
        AND persons.file_id = data_imports.id
    )`;

    const householdCountExpr = sql<number>`(
      SELECT COUNT(1)
      FROM households
      WHERE households.tenant_id = ${input.tenant_id}
        AND households.file_id = data_imports.id
    )`;

    const tagAssignmentExpr = sql<number>`(
      SELECT COUNT(1)
      FROM map_peoples_tags mpt
      WHERE mpt.tenant_id = ${input.tenant_id}
        AND mpt.tag_id = data_imports.tag_id
    )`;

    const tagExistsExpr = sql<number>`(
      SELECT CASE
        WHEN EXISTS(
          SELECT 1
          FROM tags
          WHERE tags.tenant_id = ${input.tenant_id}
            AND tags.id = data_imports.tag_id
        ) THEN 1 ELSE 0 END
    )`;

    const nameExpr = sql<string | null>`NULLIF(TRIM(CONCAT_WS(' ', creator.first_name, creator.last_name)), '')`;

    const query = this.getSelect(trx)
      .where('data_imports.tenant_id', '=', input.tenant_id)
      .leftJoin('authusers as creator', 'creator.id', 'data_imports.createdby_id')
      .select([
        'data_imports.id',
        'data_imports.tenant_id',
        'data_imports.file_name',
        'data_imports.source',
        'data_imports.tag_name',
        'data_imports.tag_id',
        'data_imports.row_count',
        'data_imports.inserted_count',
        'data_imports.error_count',
        'data_imports.skipped_count',
        'data_imports.households_created',
        'data_imports.processed_at',
        'data_imports.created_at',
        'data_imports.updated_at',
        'data_imports.createdby_id',
        'data_imports.updatedby_id',
        sql<string | null>`creator.email`.as('creator_email'),
        nameExpr.as('creator_name'),
        contactCountExpr.as('contact_count'),
        householdCountExpr.as('household_count'),
        tagAssignmentExpr.as('tag_assignment_count'),
        tagExistsExpr.as('tag_exists'),
      ])
      .orderBy('data_imports.processed_at', 'desc');

    return query;
  }

  private mapRow(row: any): DataImportWithStats {
    const cast = (value: unknown) => (value == null ? null : String(value));
    const toNumber = (value: unknown) => {
      if (value == null) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'bigint') return Number(value);
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const toBool = (value: unknown) => toNumber(value) > 0;

    return {
      id: cast(row['id']) ?? '',
      tenant_id: cast(row['tenant_id']) ?? '',
      file_name: cast(row['file_name']) ?? '',
      source: cast(row['source']) ?? 'persons',
      tag_name: cast(row['tag_name']),
      tag_id: cast(row['tag_id']),
      row_count: toNumber(row['row_count']),
      inserted_count: toNumber(row['inserted_count']),
      error_count: toNumber(row['error_count']),
      skipped_count: toNumber(row['skipped_count']),
      households_created: toNumber(row['households_created']),
      processed_at: this.coerceDate(row['processed_at']),
      created_at: this.coerceDate(row['created_at']),
      updated_at: this.coerceDate(row['updated_at']),
      createdby_id: cast(row['createdby_id']) ?? '',
      updatedby_id: cast(row['updatedby_id']) ?? '',
      created_by_email: cast(row['creator_email']),
      created_by_name: cast(row['creator_name']),
      contact_count: toNumber(row['contact_count']),
      household_count: toNumber(row['household_count']),
      tag_assignment_count: toNumber(row['tag_assignment_count']),
      tag_exists: toBool(row['tag_exists']),
    };
  }

  private coerceDate(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const ts = new Date(value);
      if (!Number.isNaN(ts.valueOf())) return ts;
    }
    return new Date(0);
  }
}
