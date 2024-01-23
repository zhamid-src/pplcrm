import { BaseRepository } from './base.repository';

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
}
