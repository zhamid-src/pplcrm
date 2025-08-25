/**
 * Repository for reading and writing email comment records.
 */
import { BaseRepository } from '../base.repo';

/**
 * Data access for the `email_comments` table.
 */
export class EmailCommentsRepo extends BaseRepository<'email_comments'> {
  /**
   * Creates a repository instance for the `email_comments` table.
   */
  constructor() {
    super('email_comments');
  }

  /**
   * Retrieve all comments for a specific email.
   *
   * @param tenant_id - Tenant that owns the email.
   * @param email_id - Identifier of the email to fetch comments for.
   * @returns All comment rows linked to the email.
   */
  public getForEmail(tenant_id: string, email_id: string) {
    return this.getAllByColumn('email_id', { tenant_id, column: email_id });
  }
}
