import { Models, TableColumnsType } from 'common/src/lib/kysely.models';
import { Transaction, sql } from 'kysely';
import { BaseRepository, QueryParams } from './base.repository';

type TYPE = 'persons' | 'households' | 'tags' | 'map_peoples_tags';

export class PersonsHouseholdsTagsRepository extends BaseRepository<TYPE> {
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
  public async getAllWithAddress(optionsIn?: QueryParams<TYPE>, trx?: Transaction<Models>) {
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
        'name as tags',
        sql<string>`concat(households.street_num, ' ', households.street)`.as('address'),
      ] as TableColumnsType<TYPE>[]);

    //TODO: use options
    return this.getSelect(trx)
      .leftJoin('households', 'persons.household_id', 'households.id')
      .leftJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .leftJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .select(({ fn }) => [
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.notes',
        sql<string>`concat(households.street_num, ' ', households.street)`.as('address'),
        fn.agg<string[]>('array_agg', ['tags.name']).as('tags'),
      ])
      .groupBy([
        'persons.id',
        'persons.first_name',
        'persons.last_name',
        'persons.email',
        'persons.mobile',
        'persons.notes',
        'address',
      ])
      .execute();
  }
}
