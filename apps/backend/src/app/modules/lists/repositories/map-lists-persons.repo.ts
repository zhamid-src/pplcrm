import { BaseRepository } from '../../../lib/base.repo';

/** Repository for the `map_lists_persons` table. */
export class MapListsPersonsRepo extends BaseRepository<'map_lists_persons'> {
  constructor() {
    super('map_lists_persons');
  }
}
