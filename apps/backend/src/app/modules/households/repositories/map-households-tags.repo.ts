/**
 * Repository handling the mapping between households and tags.
 */
import { MapTagsRepo } from '../../../lib/map-tags.repo';

/**
 * Data access for the `map_households_tags` table.
 */
export class MapHouseholdsTagsRepo extends MapTagsRepo<'map_households_tags'> {
  constructor() {
    super('map_households_tags', 'household_id');
  }
}
