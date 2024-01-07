import { sql } from 'kysely';
import { BaseOperator } from './base.operator';

export class HouseholdOperator extends BaseOperator<'households'> {
  constructor() {
    super('households');
  }

  /**
   * Get all households with the count of people in them
   */
  public getAllWithPeopleCount() {
    return this.getSelect()
      .select(sql<string>`households.*`.as('households'))
      .select(sql<string>`count(persons)`.as('person_count'))
      .leftJoin('persons', 'households.id', 'persons.household_id')
      .groupBy(['households.id', 'households.tenant_id'])
      .execute();
  }
}
