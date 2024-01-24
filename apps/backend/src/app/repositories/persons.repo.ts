import { Models, TypeTableColumns } from 'common/src/lib/kysely.models';
import { Transaction, sql } from 'kysely';
import { BaseRepository, QueryParams } from './base.repo';

export class PersonsRepo extends BaseRepository<'persons'> {
  constructor() {
    super('persons');
  }

  public async getAllWithAddress(
    tenant_id: string,
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
        sql<string>`concat(households.apt, '-', households.street_num, ' ', households.street, ','households.city')`.as(
          'address',
        ),
      ] as TypeTableColumns<'persons' | 'households' | 'tags' | 'map_peoples_tags'>[]);

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
        sql<string>`concat(households.street_num, ' ', households.street, ', ', households.city)`.as(
          'address',
        ),
        fn.agg<string[]>('array_agg', ['tags.name']).as('tags'),
      ])
      .where('households.tenant_id', '=', tenant_id)
      .groupBy([
        'persons.tenant_id',
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
    input: { id: string; tenant_id: string; options: QueryParams<'persons'> },
    trx?: Transaction<Models>,
  ) {
    return this.getSelectWithColumns(input.options, trx)
      .where('household_id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .execute();
  }

  public getDistinctTags(tenant_id: string) {
    return this.getSelect()
      .innerJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .where('persons.tenant_id', '=', tenant_id)
      .select('tags.name')
      .distinct()
      .execute();
  }

  public getTags(input: { id: string; tenant_id: string }) {
    return this.getSelect()
      .innerJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .where('persons.id', '=', input.id)
      .where('persons.tenant_id', '=', input.tenant_id)
      .select('tags.name')
      .execute();
  }
}
