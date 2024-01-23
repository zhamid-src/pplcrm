import { BaseRepository } from './base.repository';

export class MapPersonsTagRepo extends BaseRepository<'map_peoples_tags'> {
  constructor() {
    super('map_peoples_tags');
  }

  public async getId(person_id: string, tag_id: string) {
    const payload = await this.getSelect()
      .select('id')
      .where('person_id', '=', person_id)
      .where('tag_id', '=', tag_id)
      .executeTakeFirst();
    return payload?.id;
  }
}
