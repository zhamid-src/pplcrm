import { BaseRepository } from './base.repository';

type TYPE = 'households' | 'tags' | 'map_peoples_tags';

export class HouseholdsTagsRepository extends BaseRepository<TYPE> {
  constructor() {
    super('households');
  }

  public getDistinctTags(tenant_id: bigint) {
    return this.getSelect()
      .innerJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .innerJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .where('households.tenant_id', '=', tenant_id)
      .select('tags.name')
      .distinct()
      .execute();
  }

  public getTags(id: bigint, tenant_id: bigint) {
    return this.getSelect()
      .innerJoin('map_households_tags', 'map_households_tags.household_id', 'households.id')
      .innerJoin('tags', 'tags.id', 'map_households_tags.tag_id')
      .where('households.id', '=', id)
      .where('households.tenant_id', '=', tenant_id)
      .select('tags.name')
      .execute();
  }
}
