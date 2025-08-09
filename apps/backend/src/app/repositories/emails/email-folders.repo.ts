/**
 * Repository for storing and retrieving email folder records.
 */
import { BaseRepository } from '../base.repo';

/**
 * Data access object for the `email_folders` table.
 */
export class EmailFoldersRepo extends BaseRepository<'email_folders'> {
  /**
   * Creates a repository instance for the `email_folders` table.
   */
  constructor() {
    super('email_folders');
  }
}
