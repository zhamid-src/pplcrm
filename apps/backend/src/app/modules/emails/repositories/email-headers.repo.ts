/**
 * Repository for reading and writing email header records.
 */
import { BaseRepository } from '../../../lib/base.repo';

/**
 * Data access for the `email_headers` table.
 */
export class EmailHeadersRepo extends BaseRepository<'email_headers'> {
  /**
   * Creates a repository instance for the `email_headers` table.
   */
  constructor() {
    super('email_headers');
  }

  /**
   * Get email headers by email ID.
   *
   * @param tenant_id - Tenant that owns the email.
   * @param email_id - Identifier of the email to fetch headers for.
   * @returns Email headers record or null if not found.
   */
  public getByEmailId(tenant_id: string, email_id: string) {
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('email_id', '=', email_id)
      .executeTakeFirst();
  }
}
