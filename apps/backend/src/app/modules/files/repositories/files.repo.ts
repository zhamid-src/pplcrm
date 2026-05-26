import { BaseRepository } from '../../../lib/base.repo';

export class FilesRepo extends BaseRepository<'files'> {
  constructor() {
    super('files');
  }
}
