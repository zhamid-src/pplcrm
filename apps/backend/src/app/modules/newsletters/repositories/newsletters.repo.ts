import { sql } from 'kysely';

import { BaseRepository, QueryParams } from '../../../lib/base.repo';

export class NewslettersRepo extends BaseRepository<'newsletters'> {
  constructor() {
    super('newsletters');
  }

  public async getAllWithCount(
    tenant_id: string,
    options?: QueryParams<'newsletters'>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const opts: QueryParams<'newsletters'> = options ?? {};
    const searchStr = opts.searchStr?.toLowerCase?.();
    const filterModel = ((opts as any)?.filterModel ?? {}) as Record<string, any>;
    const startRow =
      typeof opts.startRow === 'number' ? opts.startRow : typeof opts.offset === 'number' ? opts.offset : 0;
    const limit =
      typeof opts.limit === 'number'
        ? opts.limit
        : typeof opts.endRow === 'number'
          ? Math.max(0, opts.endRow - startRow)
          : undefined;

    const applyFilters = <QB extends ReturnType<typeof this.getSelect>>(qb: QB) =>
      qb
        .where('newsletters.tenant_id', '=', tenant_id as any)
        .$if(!!searchStr, (q) => q.where(sql`LOWER(newsletters.name) LIKE ${'%' + searchStr + '%'}` as any))
        .$if(!!filterModel['name']?.value, (q) =>
          q.where('newsletters.name', 'ilike', `%${filterModel['name'].value}%`),
        )
        .$if(!!filterModel['status']?.value || typeof filterModel['status'] === 'string', (q) => {
          const raw = (filterModel['status']?.value ?? filterModel['status']) as any;
          const text = String(raw ?? '')
            .trim()
            .toLowerCase();
          if (!text) return q;
          return q.where('newsletters.status', '=', text as any);
        })
        .$if(!!filterModel['delivered_count']?.value || typeof filterModel['delivered_count'] === 'string', (q) => {
          const raw = (filterModel['delivered_count']?.value ?? filterModel['delivered_count']) as any;
          const text = String(raw ?? '').trim();
          if (!text) return q;
          if (/^\d+$/.test(text)) return q.where('newsletters.delivered_count', '=', Number(text) as any);
          return q.where(sql`CAST(newsletters.delivered_count AS TEXT) ILIKE ${'%' + text + '%'}` as any);
        })
        .$if(!!filterModel['open_rate']?.value || typeof filterModel['open_rate'] === 'string', (q) => {
          const raw = (filterModel['open_rate']?.value ?? filterModel['open_rate']) as any;
          const text = String(raw ?? '').trim();
          if (!text) return q;
          const numeric = Number(text.replace(/%/g, ''));
          if (!Number.isNaN(numeric)) return q.where('newsletters.open_rate', '=', numeric as any);
          return q.where(sql`CAST(newsletters.open_rate AS TEXT) ILIKE ${'%' + text + '%'}` as any);
        })
        .$if(!!filterModel['click_rate']?.value || typeof filterModel['click_rate'] === 'string', (q) => {
          const raw = (filterModel['click_rate']?.value ?? filterModel['click_rate']) as any;
          const text = String(raw ?? '').trim();
          if (!text) return q;
          const numeric = Number(text.replace(/%/g, ''));
          if (!Number.isNaN(numeric)) return q.where('newsletters.click_rate', '=', numeric as any);
          return q.where(sql`CAST(newsletters.click_rate AS TEXT) ILIKE ${'%' + text + '%'}` as any);
        })
        .$if(!!filterModel['send_date']?.value, (q) =>
          q.where(sql`CAST(newsletters.send_date AS TEXT) ILIKE ${'%' + filterModel['send_date'].value + '%'}` as any),
        )
        .$if(!!filterModel['total_recipients']?.value || typeof filterModel['total_recipients'] === 'string', (q) => {
          const raw = (filterModel['total_recipients']?.value ?? filterModel['total_recipients']) as any;
          const text = String(raw ?? '').trim();
          if (!text) return q;
          if (/^\d+$/.test(text)) return q.where('newsletters.total_recipients', '=', Number(text) as any);
          return q.where(sql`CAST(newsletters.total_recipients AS TEXT) ILIKE ${'%' + text + '%'}` as any);
        })
        .$if(!!filterModel['updated_at']?.value, (q) =>
          q.where(
            sql`CAST(newsletters.updated_at AS TEXT) ILIKE ${'%' + filterModel['updated_at'].value + '%'}` as any,
          ),
        )
        .$if(!!filterModel['subject']?.value, (q) =>
          q.where('newsletters.subject', 'ilike', `%${filterModel['subject'].value}%`),
        )
        .$if(!!filterModel['summary']?.value, (q) =>
          q.where('newsletters.summary', 'ilike', `%${filterModel['summary'].value}%`),
        );

    const countResult = await applyFilters(this.getSelect())
      .select(({ fn }) => [fn.countAll<number>().as('total')])
      .executeTakeFirst();
    const count = Number(countResult?.total ?? 0);

    let query = applyFilters(this.getSelect()).select([
      'newsletters.id',
      'newsletters.name',
      'newsletters.status',
      'newsletters.delivered_count',
      'newsletters.total_recipients',
      'newsletters.open_rate',
      'newsletters.click_rate',
      'newsletters.send_date',
      'newsletters.updated_at',
      'newsletters.subject',
      'newsletters.summary',
    ]);

    if (opts.sortModel?.length) {
      query = opts.sortModel.reduce((acc: typeof query, sort) => acc.orderBy(sort.colId as any, sort.sort), query);
    }

    if (startRow > 0) {
      query = query.offset(startRow);
    }

    if (typeof limit === 'number' && limit > 0) {
      query = query.limit(limit);
    }

    const rowsRaw = await query.execute();

    const rows = rowsRaw.map((row: any) => ({
      id: String(row.id),
      name: row.name,
      status: row.status,
      delivered_count: Number(row.delivered_count ?? 0),
      total_recipients: Number(row.total_recipients ?? 0),
      open_rate: row.open_rate != null ? Number(row.open_rate) : null,
      click_rate: row.click_rate != null ? Number(row.click_rate) : null,
      send_date: row.send_date ?? null,
      updated_at: row.updated_at,
      subject: row.subject ?? null,
      summary: row.summary ?? null,
    }));

    return { rows, count };
  }
}
