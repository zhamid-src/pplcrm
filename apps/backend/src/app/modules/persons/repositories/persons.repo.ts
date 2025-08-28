/**
 * Repository logic for person entities.
 */
import { SelectQueryBuilder, Transaction, sql } from 'kysely';

import { BaseRepository, JoinedQueryParams, QueryParams } from '../../../lib/base.repo';
import { Models } from 'common/src/lib/kysely.models';

/**
 * Columns available on the persons table. Used for dynamic filtering.
 */
const PERSON_COLUMNS = [
  'id',
  'household_id',
  'email',
  'email2',
  'first_name',
  'middle_names',
  'last_name',
  'home_phone',
  'mobile',
  'notes',
  'json',
];

/** Columns available on the households table for joined filtering. */
const HOUSEHOLD_COLUMNS = [
  'city',
  'state',
  'country',
  'zip',
  'street1',
  'street2',
  'street_num',
  'apt',
  'home_phone',
  'type',
];

/**
 * Repository for the `persons` table.
 *
 * Provides additional functionality for joining with `households`, `tags`, and `map_peoples_tags`.
 */
export class PersonsRepo extends BaseRepository<'persons'> {
  /**
   * Creates a repository instance for the `persons` table.
   */
  constructor() {
    super('persons');
  }

  /**
   * Get all people with joined household address and associated tags.
   *
   * @param input.tenant_id - The tenant ID to scope the query
   * @param input.options - Optional select/filter/pagination options
   * @param input.tags - If provided, filters people by tag name(s)
   * @param trx - Optional Kysely transaction
   * @returns A list of people with household address and tags
   */
  public async getAllWithAddress(
    input: {
      tenant_id: string;
      options?: QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'>;
      tags?: string[];
    },
    trx?: Transaction<Models>,
  ): Promise<{ rows: { [x: string]: any }[]; count: number }> {
    const options: JoinedQueryParams = input.options || {};
    const tenantId = input.tenant_id;
    const searchStr = options.searchStr?.toLowerCase();
    const filterModel = options.filterModel || {};
    const tags = input.tags ?? (filterModel['tags'] as string[] | undefined);

    // Shared where clause builder
    const applyFilters = <QB extends SelectQueryBuilder<any, any, any>>(qb: QB) =>
      qb
        .leftJoin('households', 'persons.household_id', 'households.id')
        .leftJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
        .leftJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
        .where('households.tenant_id', '=', tenantId)
        .$if(!!tags?.length, (q) => q.where('tags.name', 'in', tags!))
        .$if(!!searchStr, (qb) => {
          const text = `%${searchStr}%`;
          return qb.where(
            sql`(
            LOWER(persons.first_name) LIKE ${text} OR
            LOWER(persons.last_name) LIKE ${text} OR
            LOWER(persons.email) LIKE ${text} OR
            LOWER(persons.mobile) LIKE ${text} OR
            LOWER(households.city) LIKE ${text} OR
            LOWER(households.street1) LIKE ${text} OR
            LOWER(tags.name) LIKE ${text}
          )` as any,
          );
        })
        .$if(Object.keys(filterModel).length > 0, (qb) => {
          let builder = qb;
          for (const [key, value] of Object.entries(filterModel)) {
            if (key === 'tags') continue;
            if (PERSON_COLUMNS.includes(key)) {
              builder = builder.where(`persons.${key}` as any, '=', value as any);
            } else if (HOUSEHOLD_COLUMNS.includes(key)) {
              builder = builder.where(`households.${key}` as any, '=', value as any);
            }
          }
          return builder;
        });

    // Count query
    const countResult = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [fn.count(sql`DISTINCT persons.id`).as('total')])
      .execute();

    const count = Number(countResult[0]?.['total'] || 0);

    // Data query
    const rows = await applyFilters(this.getSelect(trx))
      .select(({ fn }) => [
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.notes',
        'persons.household_id',
        'households.country',
        'households.zip',
        'households.state',
        'households.home_phone',
        'households.city',
        'households.street1',
        'households.street_num',
        'households.apt',
        fn.agg<string[]>('array_agg', ['tags.name']).as('tags'),
      ])
      .groupBy([
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.notes',
        'persons.household_id',
        'households.country',
        'households.zip',
        'households.state',
        'households.home_phone',
        'households.city',
        'households.street1',
        'households.street_num',
        'households.apt',
      ])
      .$if(!!options.sortModel?.length, (qb) =>
        options.sortModel!.reduce((acc, sort) => acc.orderBy(sort.colId as any, sort.sort), qb),
      )
      .$if(typeof options.startRow === 'number' && typeof options.endRow === 'number', (qb) =>
        qb.offset(options.startRow!).limit(options.endRow! - options.startRow!),
      )
      .execute();

    return { count, rows };
  }

  /**
   * Get all people belonging to a specific household.
   *
   * @param input.id - Household ID to filter by
   * @param input.tenant_id - Tenant ID to scope the query
   * @param input.options - Optional select/pagination/sort settings
   * @param trx - Optional transaction
   * @returns A list of people in the specified household
   */
  public getByHouseholdId(
    input: { id: string; tenant_id: string; options: QueryParams<'persons'> },
    trx?: Transaction<Models>,
  ) {
    return this.getSelectWithColumns(input.options, trx)
      .where('household_id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .execute();
  }

  /**
   * Get all unique tag names assigned to people in the tenant.
   *
   * @param tenant_id - The tenant ID
   * @returns A list of unique tag names
   */
  public getDistinctTags(tenant_id: string) {
    return this.getSelect()
      .innerJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .where('persons.tenant_id', '=', tenant_id)
      .select('tags.name')
      .distinct()
      .execute();
  }

  /**
   * Get all tags associated with a specific person.
   *
   * @param input.id - Person ID
   * @param input.tenant_id - Tenant ID
   * @returns List of tag names assigned to the person
   */
  public getTags(input: { id: string; tenant_id: string }) {
    return this.getSelect()
      .innerJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .where('persons.id', '=', input.id)
      .where('persons.tenant_id', '=', input.tenant_id)
      .select('tags.name')
      .execute();
  }
}
