import { BaseRepository } from '../../../lib/base.repo';

export class MapListsHouseholdsRepo extends BaseRepository<'map_lists_households'> {
  constructor() {
    super('map_lists_households');
  }
}
