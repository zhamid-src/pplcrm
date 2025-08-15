/**
 * Repository for accessing email attachments.
 */
import { BaseRepository } from '../base.repo';

/**
 * Data access for the `email_attachments` table.
 */
export class EmailAttachmentsRepo extends BaseRepository<'email_attachments'> {
  constructor() {
    super('email_attachments');
  }

  /** Get attachments for a given email ordered by position */
  public getByEmailId(tenant_id: string, email_id: string) {
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('email_id', '=', email_id)
      .orderBy('pos')
      .execute();
  }
}
