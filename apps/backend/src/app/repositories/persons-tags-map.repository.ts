import { BaseRepository } from './base.repository';

type TYPE = 'persons' | 'tags' | 'map_peoples_tags';

export class PersonsTagsRepository extends BaseRepository<TYPE> {
  constructor() {
    super('persons');
  }

  getTags(id: bigint, tenant_id: bigint) {
    return this.getSelect()
      .innerJoin('map_peoples_tags', 'map_peoples_tags.person_id', 'persons.id')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .where('persons.id', '=', id)
      .where('persons.tenant_id', '=', tenant_id)
      .select('tags.name')
      .execute();
  }
}
