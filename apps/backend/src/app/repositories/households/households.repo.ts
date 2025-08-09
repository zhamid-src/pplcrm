/**
 * Repository utilities for household records and related queries.
 */
import { SelectQueryBuilder, Transaction, sql } from 'kysely';

import { BaseRepository, JoinedQueryParams, QueryParams } from '../base.repo';
import { Models } from 'common/src/lib/kysely.models';

/**
 * Repository for the `households` table.
 *
 * Provides table-specific queries such as joining households with people and tags.
 */
export class HouseholdRepo extends BaseRepository<'households'> {
  /**
   * Creates a repository instance for the `households` table.
   */
  constructor() {
    super('households');
  }

  /**
   * Get all households with person count and associated tags, supporting filter/search/pagination.
   *
   * @param input.tenant_id - The tenant ID to scope the query
   * @param input.options - Optional select/filter/pagination options
   * @param input.tags - If provided, filters households by tag name(s)
   * @param trx - Optional Kysely transaction
   * @returns Paginated list of households with person count and tags, and the total count
   */
  public async getAllWithPeopleCount(
    input: {
      tenant_id: string;
      options?: QueryParams<'households' | 'tags' | 'map_households_tags' | 'persons'>;
      tags?: string[];
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = options.searchStr?.toLowerCase();
    const tags = input.tags;

    // Shared where clause builder (for both queries)
    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) =>
      qb
        .leftJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
        .leftJoin('tags', 'tags.id', 'map_households_tags.tag_id')
        .$if(!!tags?.length, (q) => q.where('tags.name', 'in', tags!))
        .where('households.tenant_id', '=', tenantId)
        .$if(!!searchStr, (qb) => {
          const text = `%${searchStr}%`;
          return qb.where(
            sql`(
              LOWER(households.city) LIKE ${text} OR
              LOWER(households.street1) LIKE ${text} OR
              LOWER(households.street2) LIKE ${text} OR
              LOWER(households.notes) LIKE ${text} OR
              LOWER(tags.name) LIKE ${text}
            )` as any,
          );
        });

    // Count query
    const countResult = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count(sql`DISTINCT households.id`).as('total')])
      .execute();

    const count = Number(countResult[0]?.['total'] || 0);

    // Data query
    const rows = await applyFilters(this.getSelect(trx))
      .select([
        'households.id',
        'households.country',
        'households.zip',
        'households.state',
        'households.home_phone',
        'households.city',
        'households.apt',
        'households.street1',
        'households.street2',
        'households.street_num',
        'households.notes',
      ])
      .select((eb) => [
        eb
          .selectFrom('persons')
          .whereRef('persons.household_id', '=', 'households.id')
          .select(({ fn }) => [fn.count<number>('persons.id').as('persons_count')])
          .as('persons_count'),
      ])
      .select(({ fn }) => [fn.agg<string[]>('array_agg', ['tags.name']).as('tags')])
      .groupBy([
        'households.id',
        'households.country',
        'households.zip',
        'households.state',
        'households.home_phone',
        'households.city',
        'households.apt',
        'households.street1',
        'households.street2',
        'households.street_num',
        'households.notes',
      ])
      .$if(!!options.sortModel?.length, (qb) =>
        options.sortModel!.reduce((acc, sort) => acc.orderBy(sort.colId as any, sort.sort), qb),
      )
      .$if(typeof options.startRow === 'number' && typeof options.endRow === 'number', (qb) =>
        qb.offset(options.startRow!).limit(options.endRow! - options.startRow!),
      )
      .execute();

    return {
      rows,
      count,
    };
  }

  /**
   * Get a list of all distinct tag names used in the household map table for a tenant.
   *
   * @param tenant_id - The tenant ID
   * @returns List of distinct tag names
   */
  public getDistinctTags(tenant_id: string) {
    return this.getSelect()
      .innerJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .innerJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .where('households.tenant_id', '=', tenant_id)
      .select('tags.name')
      .distinct()
      .execute();
  }

  /**
   * Get all tags associated with a given household.
   *
   * @param id - Household ID
   * @param tenant_id - The tenant ID
   * @returns List of tag names
   */
  public getTags(id: string, tenant_id: string) {
    return this.getSelect()
      .innerJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .innerJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .where('households.id', '=', id)
      .where('households.tenant_id', '=', tenant_id)
      .select('tags.name')
      .execute();
  }
}
