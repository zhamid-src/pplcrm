import { Models } from 'common/src/lib/kysely.models';
import { Transaction, sql } from 'kysely';
import { BaseRepository } from './base.repository';

export class HouseholdRepository extends BaseRepository<'households'> {
  constructor() {
    super('households');
  }

  /**
   * Get all households with the count of people in them
   */
  public async getAllWithPeopleCount(trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .select(sql<string>`households.*`.as('households'))
      .select(sql<string>`count(persons)`.as('person_count'))
      .leftJoin('persons', 'households.id', 'persons.household_id')
      .groupBy(['households.id', 'households.tenant_id'])
      .execute();
  }
}
