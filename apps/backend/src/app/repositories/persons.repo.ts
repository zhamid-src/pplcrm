import { Transaction, sql } from 'kysely';

import { BaseRepository, JoinedQueryParams, QueryParams } from './base.repo';
import { Models, TypeTableColumns } from 'common/src/lib/kysely.models';

/**
 * Repository for the `persons` table.
 *
 * Provides additional functionality for joining with `households`, `tags`, and `map_peoples_tags`.
 */
export class PersonsRepo extends BaseRepository<'persons'> {
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
  ) {
    const options: JoinedQueryParams = input.options || {};

    options.columns =
      options?.columns ||
      ([
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.notes',
        'name as tags',
        sql<string>`concat(households.apt, '-', households.street_num, ' ', households.street, ','households.city')`.as(
          'address',
        ),
      ] as TypeTableColumns<'persons' | 'households' | 'tags' | 'map_peoples_tags'>[]);

    return this.getSelect(trx)
      .leftJoin('households', 'persons.household_id', 'households.id')
      .leftJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .leftJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
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
        'households.street',
        'households.street_num',
        'households.apt',
        fn.agg<string[]>('array_agg', ['tags.name']).as('tags'),
      ])
      .where('households.tenant_id', '=', input.tenant_id)
      .$if(!!input.tags && input.tags.length > 0, (q) => q.where('tags.name', 'in', input.tags!))
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
        'households.street',
        'households.street_num',
        'households.apt',
      ])
      .execute();
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
