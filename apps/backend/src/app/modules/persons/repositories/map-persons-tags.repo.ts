/**
 * Repository managing the relationship between people and tags.
 */
import { MapTagsRepo } from '../../../lib/map-tags.repo';

/**
 * Data access for the `map_peoples_tags` table.
 */
export class MapPersonsTagRepo extends MapTagsRepo<'map_peoples_tags'> {
  constructor() {
    super('map_peoples_tags', 'person_id');
  }
}
