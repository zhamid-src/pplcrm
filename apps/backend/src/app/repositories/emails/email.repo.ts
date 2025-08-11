/**
 * Data access layer for email message records.
 */
import { BaseRepository } from '../base.repo';
import { EmailHeadersRepo } from './email-headers.repo';
import { EmailRecipientsRepo } from './email-recipients.repo';

/**
 * Repository for the `emails` table.
 */
export class EmailRepo extends BaseRepository<'emails'> {
  private emailHeadersRepo = new EmailHeadersRepo();
  private emailRecipientsRepo = new EmailRecipientsRepo();

  /**
   * Creates a repository instance for the `emails` table.
   */
  constructor() {
    super('emails');
  }

  /**
   * Get all emails within a folder for a given tenant.
   *
   * @param tenant_id - Tenant that owns the emails.
   * @param folder_id - Identifier of the folder to retrieve emails from.
   * @returns List of email rows in the folder.
   */
  public getByFolder(tenant_id: string, folder_id: string) {
    return this.getSelect().selectAll().where('tenant_id', '=', tenant_id).where('folder_id', '=', folder_id).execute();
  }

  /**
   * Get email with headers and recipients for detailed view.
   * This combines email, headers, and recipients data using separate queries for better type safety.
   *
   * @param tenant_id - Tenant that owns the email.
   * @param email_id - Identifier of the email to fetch.
   * @returns Email with headers and categorized recipients.
   */
  public async getEmailWithHeadersAndRecipients(tenant_id: string, email_id: string) {
    // Get the base email record first
    const email = await this.getById({ tenant_id, id: email_id });
    if (!email) {
      return null;
    }

    // Get email headers using the headers repository
    const emailHeaders = await this.emailHeadersRepo.getByEmailId(tenant_id, email_id);

    // Get recipients by type using the recipients repository
    const [toRecipients, ccRecipients, bccRecipients] = await Promise.all([
      this.emailRecipientsRepo.getByEmailIdAndKind(tenant_id, email_id, 'to'),
      this.emailRecipientsRepo.getByEmailIdAndKind(tenant_id, email_id, 'cc'),
      this.emailRecipientsRepo.getByEmailIdAndKind(tenant_id, email_id, 'bcc'),
    ]);

    // Combine the results
    return {
      ...email,
      headers_json: emailHeaders?.headers_json || null,
      raw_headers: emailHeaders?.raw_headers || null,
      date_sent: emailHeaders?.date_sent || null,
      to_list: toRecipients,
      cc_list: ccRecipients,
      bcc_list: bccRecipients,
    };
  }

  public async setFavourite(tenant_id: string, id: string, is_favourite: boolean) {
    await this.getUpdate()
      .set({ is_favourite })
      .where('tenant_id', '=', tenant_id)
      .where('id', '=', id)
      .executeTakeFirst();

    return is_favourite;
  }
}
