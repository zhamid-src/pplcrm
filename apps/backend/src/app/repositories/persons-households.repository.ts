import { Models, TableColumnsType } from 'common/src/lib/kysely.models';
import { Transaction, sql } from 'kysely';
import { BaseRepository, QueryParams } from './base.repository';

type TYPE = 'persons' | 'households';

export class PersonsHouseholdsRepository extends BaseRepository<TYPE> {
  constructor() {
    super('persons');
  }

  /**
   * Get all the people with their households information.
   *
   * @param optionsIn - query options @see {@link QueryParams} for more information about the options.
   * @param trx
   * @returns
   */
  public override async getAll(optionsIn?: QueryParams<TYPE>, trx?: Transaction<Models>) {
    const options = optionsIn || ({} as QueryParams<TYPE>);

    options!.columns =
      options?.columns ||
      ([
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.notes',
        sql<string>`concat(households.street_num, ' ', households.street)`.as('address'),
      ] as TableColumnsType<'persons' | 'households'>[]);

    console.log('options set');

    let query = this.getSelect(trx).innerJoin(
      'households',
      'persons.household_id',
      'households.id',
    );

    query = this.applyOptions(query, options);
    return await query.execute();
  }

  /**
   * Get the list of people in the given household.
   *
   * @param household_id - the household ID to limit the search to
   * @param options - query options
   * @see {@link QueryParams} for more information about the options.
   *
   * @param trx - optionally, pass the transaction
   *
   * @returns
   */
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
