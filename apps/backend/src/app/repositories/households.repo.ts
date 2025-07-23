import { Models } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
import { BaseRepository } from './base.repo';

/**
 * Repository for the `households` table.
 *
 * Extends `BaseRepository` to provide table-specific queries such as
 * joining households with people and tags.
 */
export class HouseholdRepo extends BaseRepository<'households'> {
  constructor() {
    super('households');
  }

  /**
   * Get all households for a tenant with the count of people in each household
   * and the tags associated with them.
   *
   * @param tenant_id - The tenant ID
   * @param trx - Optional Kysely transaction
   * @returns List of households with person count and tags
   */
  public async getAllWithPeopleCount(tenant_id: string, trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .select([
        'households.id',
        'households.country',
        'households.zip',
        'households.state',
        'households.home_phone',
        'households.city',
        'households.street',
        'households.street_num',
        'households.apt',
        'households.notes',
      ])
      .select((eb) => [
        eb
          .selectFrom('persons')
          .whereRef('persons.household_id', '=', 'households.id')
          .select(({ fn }) => [fn.count<number>('persons.id').as('persons_count')])
          .as('persons_count'),
      ])
      .leftJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .leftJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .select(({ fn }) => [fn.agg<string[]>('array_agg', ['tags.name']).as('tags')])
      .groupBy(['households.tenant_id', 'households.id', 'households.country', 'households.city', 'households.street'])
      .execute();
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
