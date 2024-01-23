import { BaseRepository } from './base.repository';

export class MapPersonsTagRepo extends BaseRepository<'map_peoples_tags'> {
  constructor() {
    super('map_peoples_tags');
  }
}
