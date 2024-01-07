import { TableType } from '../../../../../common/src/lib/kysely.models';
import { BaseOperator, QueryParams } from './base.operator';

export class PersonsOperator extends BaseOperator<TableType.persons | TableType.households> {
  constructor() {
    super(TableType.persons);
  }

  /**
   * Get all persons with their household addresses
   * @param optionsIn
   * @returns
   */
  public async getAllWithHouseholds(
    optionsIn?: QueryParams<TableType.persons | TableType.households>,
  ): Promise<Partial<TableType.persons | TableType.households>[]> {
    const options = optionsIn || ({} as QueryParams<TableType.persons | TableType.households>);

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

    return (await query.execute()) as Partial<TableType.households | TableType.persons>[];
  }

  /**
   * Get the number of people in the given household
   * @param household_id
   * @param options
   * @returns
   */
  public getPersonsInHousehold(
    household_id: bigint,
    options?: QueryParams<TableType.persons | TableType.households>,
  ) {
    return this.getSelectWithColumns(options).where('household_id', '=', household_id).execute();
  }
}
