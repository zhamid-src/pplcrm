import { Models } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
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
      .select([
        'households.id',
        'households.country',
        'households.city',
        'households.street',
        'households.street_num',
        'households.apt',
      ])
      .select((eb) => [
        eb
          .selectFrom('persons')
          .whereRef('persons.household_id', '=', 'households.id')
          .select(({ fn }) => [fn.count<number>('persons.id').as('persons_count')])
          .as('persons_count'), // Alias the subquery
      ])
      .leftJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .leftJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .select(({ fn }) => [fn.agg<string[]>('array_agg', ['tags.name']).as('tags')])
      .groupBy([
        'households.tenant_id',
        'households.id',
        'households.country',
        'households.city',
        'households.street',
        'households.street_num',
        'households.apt',
      ])
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
