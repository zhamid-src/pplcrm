/**
 * Repository for reading and writing email recipient records.
 */
import { BaseRepository } from '../../../lib/base.repo';

/**
 * Data access for the `email_recipients` table.
 */
export class EmailRecipientsRepo extends BaseRepository<'email_recipients'> {
  /**
   * Creates a repository instance for the `email_recipients` table.
   */
  constructor() {
    super('email_recipients');
  }

  /**
   * Get all recipients for a specific email, grouped by type.
   *
   * @param tenant_id - Tenant that owns the email.
   * @param email_id - Identifier of the email to fetch recipients for.
   * @returns All recipient rows linked to the email, ordered by position.
   */
  public getByEmailId(tenant_id: string, email_id: string) {
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('email_id', '=', email_id)
      .orderBy('kind')
      .orderBy('pos')
      .execute();
  }

  /**
   * Get recipients of a specific type for an email.
   *
   * @param tenant_id - Tenant that owns the email.
   * @param email_id - Identifier of the email to fetch recipients for.
   * @param kind - Type of recipients ('to', 'cc', 'bcc').
   * @returns Recipients of the specified type, ordered by position.
   */
  public getByEmailIdAndKind(tenant_id: string, email_id: string, kind: 'to' | 'cc' | 'bcc') {
    return this.getSelect()
      .select(['name', 'email', 'pos'])
      .where('tenant_id', '=', tenant_id)
      .where('email_id', '=', email_id)
      .where('kind', '=', kind)
      .orderBy('pos')
      .execute();
  }
}
