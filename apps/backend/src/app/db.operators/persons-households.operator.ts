import { Models, TableIdType } from 'common/src/lib/kysely.models';
import { DeleteResult, InsertObject, Selectable } from 'kysely';
import { SimplifyResult } from 'node_modules/kysely/dist/cjs/util/type-utils';
import { BaseOperator, QueryParams } from './base.operator';

type TYPE = 'persons' | 'households';

export class PersonsHouseholdsOperator extends BaseOperator<TYPE> {
  constructor() {
    super('persons');
  }

  public override addMany(
    rows: readonly InsertObject<Models, TYPE>[],
  ): Promise<SimplifyResult<Selectable<Models[TYPE]>>[]> {
    throw Error('Not supported');
  }

  public override addOne(
    rows: readonly InsertObject<Models, TYPE>[],
  ): Promise<SimplifyResult<Selectable<Models[TYPE]>>> {
    throw Error('Not supported');
  }

  public override async deleteOne(id: TableIdType<TYPE>): Promise<DeleteResult[]> {
    throw Error('Not supported');
  }

  public override async findAll(optionsIn?: QueryParams<TYPE>) {
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
    return await query.execute();
  }

  public getPersonsInHousehold(household_id: bigint, options?: QueryParams<TYPE>) {
    return this.getSelectWithColumns(options).where('household_id', '=', household_id).execute();
  }
}
