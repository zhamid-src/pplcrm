import { BaseRepository } from './base.repo';

export class MapPersonsTagRepo extends BaseRepository<'map_peoples_tags'> {
  constructor() {
    super('map_peoples_tags');
  }

  public async getId(tenant_id: string, person_id: string, tag_id: string) {
    const payload = await this.getSelect()
      .select('id')
      .where('person_id', '=', person_id)
      .where('tag_id', '=', tag_id)
      .where('tenant_id', '=', tenant_id)
      .executeTakeFirst();
    return payload?.id;
  }
}
