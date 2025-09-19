import { SelectQueryBuilder, Transaction, sql } from 'kysely';

import { BaseRepository, JoinedQueryParams, QueryParams } from '../../../lib/base.repo';
import { Models } from 'common/src/lib/kysely.models';

/**
 * Repository for interacting with the `lists` table and membership mappings.
 */
export class ListsRepo extends BaseRepository<'lists'> {
  constructor() {
    super('lists');
  }

  /**
   * Retrieve all lists with computed member counts and creator information.
   *
   * @param input.tenant_id - Tenant scope
   * @param input.options - Optional filtering/pagination options
   * @param trx - Optional transaction
   */
  public override async getAllWithCounts(
    input: {
      tenant_id: string;
      options?: QueryParams<'lists' | 'map_lists_persons' | 'map_lists_households' | 'authusers'>;
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = options.searchStr?.toLowerCase();
    const filterModel = ((options as any)?.filterModel ?? {}) as Record<string, any>;

    const startRow = typeof options.startRow === 'number' ? options.startRow : 0;
    const endRow = typeof options.endRow === 'number' && options.endRow > startRow ? options.endRow : startRow + 100;

    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) =>
      qb
        .leftJoin('map_lists_persons', 'map_lists_persons.list_id', 'lists.id')
        .leftJoin('map_lists_households', 'map_lists_households.list_id', 'lists.id')
        .leftJoin('authusers', 'authusers.id', 'lists.createdby_id')
        .where('lists.tenant_id', '=', tenantId)
        .$if(!!searchStr, (qb) => {
          const text = `%${searchStr}%`;
          return qb.where(
            sql`(
              LOWER(lists.name) LIKE ${text} OR
              LOWER(lists.description) LIKE ${text} OR
              LOWER(COALESCE(authusers.first_name, '')) LIKE ${text} OR
              LOWER(COALESCE(authusers.last_name, '')) LIKE ${text} OR
              LOWER(COALESCE(authusers.first_name || ' ' || authusers.last_name, '')) LIKE ${text}
            )` as any,
          );
        })
        // Column filters
        .$if(!!filterModel['name']?.value, (q) => q.where('lists.name', 'ilike', `%${filterModel['name'].value}%`))
        .$if(!!filterModel['description']?.value, (q) =>
          q.where('lists.description', 'ilike', `%${filterModel['description'].value}%`),
        )
        .$if(!!filterModel['object']?.value || typeof filterModel['object'] === 'string', (q) => {
          const raw = (filterModel['object']?.value ?? filterModel['object']) as any;
          const v = String(raw || '')
            .trim()
            .toLowerCase();
          if (!v) return q;
          if (v === 'people' || v === 'households') return q.where('lists.object', '=', v as any);
          return q.where('lists.object', '=', v as any);
        })
        .$if(!!filterModel['created_by']?.value || typeof filterModel['created_by'] === 'string', (q) => {
          const raw = (filterModel['created_by']?.value ?? filterModel['created_by']) as any;
          const val = String(raw || '').trim();
          if (!val) return q;
          const isNumeric = /^\d+$/.test(val);
          if (isNumeric) {
            return q.where(
              sql`(
                COALESCE(authusers.first_name || ' ' || authusers.last_name, '') ILIKE ${'%' + val + '%'} OR
                lists.createdby_id = ${Number(val)}
              )` as any,
            );
          }
          return q.where(
            sql`COALESCE(authusers.first_name || ' ' || authusers.last_name, '') ILIKE ${'%' + val + '%'}` as any,
          );
        })
        .$if(!!filterModel['updated_at']?.value, (q) =>
          q.where(sql`CAST(lists.updated_at AS TEXT) ILIKE ${'%' + filterModel['updated_at'].value + '%'}` as any),
        );

    const countResult = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count(sql`DISTINCT lists.id`).as('total')])
      .execute();
    const count = Number(countResult[0]?.['total'] || 0);

    const rowsRaw = await applyFilters(this.getSelect(trx))
      .select(() => [
        'lists.id',
        'lists.name',
        'lists.description',
        'lists.object',
        'lists.is_dynamic',
        'lists.updated_at',
        sql<number>`COUNT(DISTINCT map_lists_persons.person_id)`.as('people_count'),
        sql<number>`COUNT(DISTINCT map_lists_households.household_id)`.as('household_count'),
        sql<string>`CONCAT(authusers.first_name, ' ', authusers.last_name)`.as('created_by'),
      ])
      .groupBy([
        'lists.id',
        'lists.name',
        'lists.description',
        'lists.object',
        'lists.is_dynamic',
        'lists.updated_at',
        'authusers.first_name',
        'authusers.last_name',
      ])
      .$if(!!options.sortModel?.length, (qb) => {
        const sorts = options.sortModel ?? [];
        const createdSort = sorts.find((s) => s.colId === 'created_by');
        const listSizeSort = sorts.find((s) => s.colId === 'list_size');
        const usedInSort = sorts.find((s) => s.colId === 'used_in');
        const others = sorts.filter(
          (s) => s.colId !== 'created_by' && s.colId !== 'list_size' && s.colId !== 'used_in',
        );
        let acc: any = qb;
        // created_by sort: sort by full name of creator
        if (createdSort) {
          acc = acc.orderBy(
            sql`COALESCE(authusers.first_name || ' ' || authusers.last_name, '')`,
            (createdSort as any).sort,
          );
        }
        // list_size sort: derived from people_count vs household_count
        if (listSizeSort) {
          acc = acc.orderBy(
            sql`CASE WHEN lists.object = 'people' THEN COUNT(DISTINCT map_lists_persons.person_id) ELSE COUNT(DISTINCT map_lists_households.household_id) END`,
            (listSizeSort as any).sort,
          );
        }
        // used_in sort: field is a UI placeholder; sort by a stable column instead (updated_at)
        if (usedInSort) {
          acc = acc.orderBy('lists.updated_at' as any, (usedInSort as any).sort);
        }
        for (const s of others) acc = acc.orderBy(s.colId as any, (s as any).sort);
        return acc;
      })
      .offset(startRow)
      .limit(endRow - startRow)
      .execute();

    const rows = rowsRaw.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      object: r.object,
      is_dynamic: r.is_dynamic,
      updated_at: r.updated_at,
      list_size: r.object === 'people' ? Number(r.people_count) : Number(r.household_count),
      used_in: 0,
      created_by: r.created_by,
    }));

    return { rows, count };
  }

  /**
   * Return households on a list with a minimal set of fields.
   */
  public async getHouseholdsByListId(
    input: { tenant_id: string; list_id: string },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const qb = this.getSelect(trx)
      .innerJoin('map_lists_households as mlh', 'mlh.list_id', 'lists.id')
      .innerJoin('households', 'households.id', 'mlh.household_id')
      .where('lists.tenant_id', '=', input.tenant_id)
      .where('lists.id', '=', input.list_id);

    const [{ total }] = await qb.select(({ fn }) => [fn.count(sql`DISTINCT households.id`).as('total')]).execute();

    const rows = await qb
      .select([
        'households.id',
        'households.street1',
        'households.street_num',
        'households.city',
        'households.state',
        'households.zip',
      ])
      .groupBy([
        'households.id',
        'households.street1',
        'households.street_num',
        'households.city',
        'households.state',
        'households.zip',
      ])
      .execute();

    return { rows, count: Number(total || 0) };
  }

  /**
   * Return persons on a list with a minimal set of fields and household address.
   */
  public async getPersonsByListId(
    input: { tenant_id: string; list_id: string },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const qb = this.getSelect(trx)
      .innerJoin('map_lists_persons as mlp', 'mlp.list_id', 'lists.id')
      .innerJoin('persons', 'persons.id', 'mlp.person_id')
      .leftJoin('households', 'households.id', 'persons.household_id')
      .where('lists.tenant_id', '=', input.tenant_id)
      .where('lists.id', '=', input.list_id);

    const [{ total }] = await qb.select(({ fn }) => [fn.count(sql`DISTINCT persons.id`).as('total')]).execute();

    const rows = await qb
      .select([
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.household_id',
        'households.city',
        'households.state',
        'households.street1',
        'households.street_num',
        'households.zip',
      ])
      .groupBy([
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.household_id',
        'households.city',
        'households.state',
        'households.street1',
        'households.street_num',
        'households.zip',
      ])
      .execute();

    return { rows, count: Number(total || 0) };
  }
}
