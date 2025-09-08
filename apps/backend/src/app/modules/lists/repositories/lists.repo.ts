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
  public async getAllWithCounts(
    input: {
      tenant_id: string;
      options?: QueryParams<'lists' | 'map_lists_persons' | 'map_lists_households' | 'authusers'>;
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = options.searchStr?.toLowerCase();

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
        });

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
        // If sorting by created_by alias, order by authusers full name
        const createdSort = sorts.find((s) => s.colId === 'created_by');
        const others = sorts.filter((s) => s.colId !== 'created_by');
        let acc: any = qb;
        if (createdSort) {
          acc = acc.orderBy(
            sql`COALESCE(authusers.first_name || ' ' || authusers.last_name, '')`,
            (createdSort as any).sort,
          );
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
