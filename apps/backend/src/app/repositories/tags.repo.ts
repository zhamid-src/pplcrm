import { Models } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
import { BaseRepository } from './base.repo';

export class TagsRepo extends BaseRepository<'tags'> {
  constructor() {
    super('tags');
  }

  public getIdByName(input: { tenant_id: string; name: string }, trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .select('id')
      .where('name', '=', input.name)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();
  }
  public getAllWithCounts(
    input: {
      tenant_id: string;
    },
    trx?: Transaction<Models>,
  ) {
    return this.getSelect(trx)
      .leftJoin('map_peoples_tags', 'map_peoples_tags.tag_id', 'tags.id')
      .leftJoin('map_households_tags', 'map_households_tags.tag_id', 'tags.id')
      .select(({ fn }) => [
        'tags.id',
        'tags.name',
        'tags.description',
        fn.count('map_peoples_tags.person_id').as('use_count_people'),
        fn.count('map_households_tags.household_id').as('use_count_households'),
      ])
      .groupBy(['tags.id', 'tags.name', 'tags.description'])
      .where('tags.tenant_id', '=', input.tenant_id)
      .execute();
  }
}
