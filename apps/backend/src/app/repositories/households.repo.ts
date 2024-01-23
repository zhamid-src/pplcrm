import { Models } from 'common/src/lib/kysely.models';
import { Transaction, sql } from 'kysely';
import { BaseRepository } from './base.repo';

export class HouseholdRepo extends BaseRepository<'households'> {
  constructor() {
    super('households');
  }

  /**
   * Get all households with the count of people in them
   */
  public async getAllWithPeopleCount(tenant_id: string, trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .select(sql<string>`households.*`.as('households'))
      .select(sql<string>`count(persons)`.as('person_count'))
      .leftJoin('persons', 'households.id', 'persons.household_id')
      .where('households.tenant_id', '=', tenant_id)
      .groupBy(['households.id', 'households.tenant_id'])
      .execute();
  }

  public getDistinctTags(tenant_id: string) {
    return this.getSelect()
      .innerJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .innerJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .where('households.tenant_id', '=', tenant_id)
      .select('tags.name')
      .distinct()
      .execute();
  }

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
