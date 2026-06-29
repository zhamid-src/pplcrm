import type { ReferenceExpression, SelectQueryBuilder, Transaction } from 'kysely';
import { sql } from 'kysely';

import type { QueryParams } from '../../../lib/base.repo';
import { BaseRepository } from '../../../lib/base.repo';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class WebFormsRepo extends BaseRepository<'web_forms'> {
  constructor() {
    super('web_forms');
  }

  public async getByIdPublic(id: string, trx?: Transaction<Models>) {
    return this.getSelect(trx).selectAll().where('id', '=', id).executeTakeFirst();
  }

  public override async getAllWithCounts(
    input: {
      tenant_id: string;
      options?: QueryParams<'web_forms'>;
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: Record<string, unknown>[]; count: number }> {
    const options = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = this.normalizeSearch(options.searchStr);
    const filterModel = (options.filterModel ?? {}) as Record<string, { value: string } | undefined>;

    const startRow = typeof options.startRow === 'number' ? options.startRow : 0;
    const endRow = typeof options.endRow === 'number' && options.endRow > startRow ? options.endRow : startRow + 100;

    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) =>
      qb
        .where('web_forms.tenant_id', '=', tenantId)
        .$if(!!searchStr, (qb) => {
          const text = searchStr;
          return qb.where(
            sql<boolean>`(
            LOWER(web_forms.name) LIKE ${text} OR
            LOWER(web_forms.description) LIKE ${text}
          )`,
          );
        })
        .$if(!!filterModel['name']?.value, (q) => q.where('web_forms.name', 'ilike', `%${filterModel['name']?.value}%`))
        .$if(!!filterModel['description']?.value, (q) =>
          q.where('web_forms.description', 'ilike', `%${filterModel['description']?.value}%`),
        )
        .$if(!!filterModel['status']?.value, (q) => q.where('web_forms.status', '=', filterModel['status']?.value));

    const countResult = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count(sql`DISTINCT web_forms.id`).as('total')])
      .execute();

    const count = Number(countResult[0]?.['total'] || 0);

    const rows = await applyFilters(this.getSelect(trx))
      .select([
        'web_forms.id',
        'web_forms.tenant_id',
        'web_forms.name',
        'web_forms.description',
        'web_forms.redirect_url',
        'web_forms.target_tags',
        'web_forms.target_lists',
        'web_forms.status',
        'web_forms.createdby_id',
        'web_forms.updatedby_id',
        'web_forms.created_at',
        'web_forms.updated_at',
        'web_forms.send_confirmation',
        'web_forms.send_alert',
      ])
      .$if(!!options.sortModel?.length, (qb) =>
        (options.sortModel ?? []).reduce(
          (acc, sort) => acc.orderBy(sort.colId as ReferenceExpression<any, any>, sort.sort),
          qb,
        ),
      )
      .offset(startRow)
      .limit(endRow - startRow)
      .execute();

    const formattedRows = rows.map((row) => ({
      ...row,
      id: String(row['id']),
      target_tags: Array.isArray(row['target_tags'])
        ? row['target_tags']
        : JSON.parse(String(row['target_tags'] || '[]')),
      target_lists: Array.isArray(row['target_lists'])
        ? row['target_lists']
        : JSON.parse(String(row['target_lists'] || '[]')),
    }));

    return {
      rows: formattedRows,
      count,
    };
  }
}
