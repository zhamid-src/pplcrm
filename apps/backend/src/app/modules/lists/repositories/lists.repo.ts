import { SelectQueryBuilder, Transaction, sql } from 'kysely';

import { BaseRepository, JoinedQueryParams, QueryParams } from '../../../lib/base.repo';
import { Models, OperationDataType } from 'common/src/lib/kysely.models';

/**
 * Repository for interacting with the `lists` table and membership mappings.
 */
export class ListsRepo extends BaseRepository<'lists'> {
  constructor() {
    super('lists');
  }

  private personsMapRepo = new BaseRepository<'map_lists_persons'>('map_lists_persons');
  private householdsMapRepo = new BaseRepository<'map_lists_households'>('map_lists_households');

  /** Add many person members to a list. */
  public addPersons(
    rows: OperationDataType<'map_lists_persons', 'insert'>[],
    trx?: Transaction<Models>,
  ) {
    return this.personsMapRepo.addMany({ rows }, trx);
  }

  /** Add many household members to a list. */
  public addHouseholds(
    rows: OperationDataType<'map_lists_households', 'insert'>[],
    trx?: Transaction<Models>,
  ) {
    return this.householdsMapRepo.addMany({ rows }, trx);
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
          return qb.where(sql`(LOWER(lists.name) LIKE ${text} OR LOWER(lists.description) LIKE ${text})` as any);
        });

    const countResult = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count(sql`DISTINCT lists.id`).as('total')])
      .execute();
    const count = Number(countResult[0]?.['total'] || 0);

    const rowsRaw = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [
        'lists.id',
        'lists.name',
        'lists.description',
        'lists.object',
        'lists.is_dynamic',
        'lists.updated_at',
        sql<number>`COUNT(DISTINCT map_lists_persons.person_id)` .as('people_count'),
        sql<number>`COUNT(DISTINCT map_lists_households.household_id)` .as('household_count'),
        sql<string>`CONCAT(authusers.first_name, ' ', authusers.last_name)` .as('created_by'),
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
      .$if(!!options.sortModel?.length, (qb) =>
        options.sortModel!.reduce((acc, sort) => acc.orderBy(sort.colId as any, sort.sort), qb),
      )
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
}
