import { Models, TableColumnsType } from 'common/src/lib/kysely.models';
import { Transaction, sql } from 'kysely';
import { BaseRepository, QueryParams } from './base.repository';

export class PersonsRepo extends BaseRepository<'persons'> {
  constructor() {
    super('persons');
  }
  public getTags(id: bigint, tenant_id: bigint) {
    return this.getSelect()
      .innerJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .where('persons.id', '=', id)
      .where('persons.tenant_id', '=', tenant_id)
      .select('tags.name')
      .execute();
  }
  public getDistinctTags(tenant_id: bigint) {
    return this.getSelect()
      .innerJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .where('persons.tenant_id', '=', tenant_id)
      .select('tags.name')
      .distinct()
      .execute();
  }
  public async getAllWithAddress(
    optionsIn?: QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'>,
    trx?: Transaction<Models>,
  ) {
    const options =
      optionsIn || ({} as QueryParams<'persons' | 'households' | 'tags' | 'map_peoples_tags'>);

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
      ] as TableColumnsType<'persons' | 'households' | 'tags' | 'map_peoples_tags'>[]);

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
  public getByHouseholdId(
    household_id: bigint,
    tenant_id: bigint,
    options: QueryParams<'persons'>,
    trx?: Transaction<Models>,
  ) {
    return this.getSelectWithColumns(options, trx)
      .where('household_id', '=', household_id)
      .where('tenant_id', '=', tenant_id)
      .execute();
  }
}
