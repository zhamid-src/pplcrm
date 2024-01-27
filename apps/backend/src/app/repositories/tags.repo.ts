import { Models, TypeId, TypeTenantId } from 'common/src/lib/kysely.models';
import { Transaction } from 'kysely';
import { BaseRepository } from './base.repo';

export class TagsRepo extends BaseRepository<'tags'> {
  constructor() {
    super('tags');
  }

  public override async deleteMany(input: {
    tenant_id: TypeTenantId<'tags'>;
    ids: TypeId<'tags'>;
  }) {
    return await this.transaction().execute(async (trx) => {
      const tag_ids = input.ids;
      await trx
        .deleteFrom('map_households_tags')
        .where('tag_id', 'in', tag_ids as TypeId<'map_households_tags'>)
        .execute();

      await trx
        .deleteFrom('map_peoples_tags')
        .where('tag_id', 'in', tag_ids as TypeId<'map_peoples_tags'>)
        .execute();

      return (
        (await trx
          .deleteFrom('tags')
          .where('id', 'in', tag_ids)
          .where('deletable', '=', true)
          .execute()) !== null
      );
    });
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
        'tags.deletable',
        fn.count('map_peoples_tags.person_id').as('use_count_people'),
        fn.count('map_households_tags.household_id').as('use_count_households'),
      ])
      .groupBy(['tags.id', 'tags.name', 'tags.description', 'tags.deletable'])
      .where('tags.tenant_id', '=', input.tenant_id)
      .execute();
  }

  public getIdByName(input: { tenant_id: string; name: string }, trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .select('id')
      .where('name', '=', input.name)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();
  }
}
