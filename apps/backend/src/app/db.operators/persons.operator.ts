import { BaseOperator, QueryParams } from './base.operator';

type TYPE = 'persons' | 'households';

export class PersonsOperator extends BaseOperator<TYPE> {
  constructor() {
    super('persons');
  }

  public async getAllWithHouseholds(optionsIn?: QueryParams<TYPE>): Promise<Partial<TYPE>[]> {
    const options = optionsIn || ({} as QueryParams<TYPE>);

    options!.columns = options?.columns || [
      'persons.id',
      'persons.first_name',
      'persons.last_name',
      'persons.email',
      'persons.mobile',
      'persons.notes',
      'households.street1',
      'households.city',
    ];

    let query = this.getSelect().innerJoin('households', 'persons.household_id', 'households.id');
    query = this.applyOptions(query, options);
    return (await query.execute()) as Partial<TYPE>[];
  }

  public getPersonsInHousehold(household_id: bigint, options?: QueryParams<TYPE>) {
    return this.getSelectWithColumns(options).where('household_id', '=', household_id).execute();
  }
}
