import { Models } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
import { BaseRepository, QueryParams } from './base.repository';

type TYPE = 'persons' | 'households';

export class PersonsHouseholdsRepository extends BaseRepository<TYPE> {
  constructor() {
    super('persons');
  }

  public override async findAll(optionsIn?: QueryParams<TYPE>, trx?: Transaction<Models>) {
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

    let query = this.getSelect(trx).innerJoin(
      'households',
      'persons.household_id',
      'households.id',
    );
    query = this.applyOptions(query, options);
    return await query.execute();
  }

  public getPersonsInHousehold(
    household_id: bigint,
    options?: QueryParams<TYPE>,
    trx?: Transaction<Models>,
  ) {
    return this.getSelectWithColumns(options, trx)
      .where('household_id', '=', household_id)
      .execute();
  }
}
