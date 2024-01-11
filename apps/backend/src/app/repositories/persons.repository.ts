import { BaseRepository } from './base.repository';

export class PersonsRepository extends BaseRepository<'persons'> {
  constructor() {
    super('persons');
  }
}
