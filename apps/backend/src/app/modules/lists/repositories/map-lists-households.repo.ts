import { BaseRepository } from '../../../lib/base.repo';

/** Repository for the `map_lists_households` table. */
export class MapListsHouseholdsRepo extends BaseRepository<'map_lists_households'> {
  constructor() {
    super('map_lists_households');
  }
}
