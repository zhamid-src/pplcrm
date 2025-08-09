import { BaseRepository } from '../base.repo';

/** Repository for email folders */
export class EmailFoldersRepo extends BaseRepository<'email_folders'> {
  constructor() {
    super('email_folders');
  }
}
