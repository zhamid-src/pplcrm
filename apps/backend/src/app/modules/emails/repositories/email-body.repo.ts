/**
 * Repository for reading and writing email comment records.
 */
import { BaseRepository } from '../../../lib/base.repo';

/**
 * Data access for the `email_bodies` table.
 */
export class EmailBodiesRepo extends BaseRepository<'email_bodies'> {
  /**
   * Creates a repository instance for the `email_body` table.
   */
  constructor() {
    super('email_bodies');
  }
}
