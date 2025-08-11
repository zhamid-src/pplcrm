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
   * Handles special folders: All Open (id=1) and Closed (id=2).
   *
   * @param tenant_id - Tenant that owns the emails.
   * @param folder_id - Identifier of the folder to retrieve emails from.
   * @returns List of email rows in the folder.
   */
  public async getByFolder(tenant_id: string, folder_id: string) {
    const query = this.getSelect().selectAll().where('tenant_id', '=', tenant_id);

    // Handle special folders
    if (folder_id === '1') {
      // All Open folder - show emails with status 'open' or null (default to open)
      try {
        return await query.where((eb) => eb.or([eb('status', '=', 'open'), eb('status', 'is', null)])).execute();
      } catch (error) {
        // If status column doesn't exist, return all emails
        console.warn('Status column not found, returning all emails for All Open folder');
        return await query.execute();
      }
    } else if (folder_id === '2') {
      // Closed folder - show emails with status 'closed' or 'resolved'
      try {
        return await query.where((eb) => eb.or([eb('status', '=', 'closed'), eb('status', '=', 'resolved')])).execute();
      } catch (error) {
        // If status column doesn't exist, return empty array
        console.warn('Status column not found, returning empty array for Closed folder');
        return [];
      }
    } else if (folder_id === '6') {
      // Assigned to me folder - show emails assigned to the current user
      // Note: We'd need the user_id from the context for this to work properly
      return await query.where('assigned_to', 'is not', null).execute();
    }

    // Regular folder - show emails in that specific folder
    return query.where('folder_id', '=', folder_id).execute();
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

  /**
   * Get email counts for all folders for a given tenant.
   * Includes special handling for virtual folders.
   *
   * @param tenant_id - Tenant that owns the emails.
   * @returns Object mapping folder_id to email count.
   */
  public async getEmailCountsByFolder(tenant_id: string): Promise<Record<string, number>> {
    // Get regular folder counts
    const results = await this.getSelect()
      .select(['folder_id'])
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', tenant_id)
      .groupBy('folder_id')
      .execute();

    // Convert array of results to object mapping folder_id -> count
    const counts: Record<string, number> = {};
    for (const result of results) {
      counts[result.folder_id] = Number(result.count);
    }

    // Add counts for special folders
    try {
      // All Open folder (id=1) - count open emails
      const openEmailsResult = await this.getSelect()
        .select((eb) => eb.fn.count('id').as('count'))
        .where('tenant_id', '=', tenant_id)
        .where((eb) => eb.or([eb('status', '=', 'open'), eb('status', 'is', null)]))
        .executeTakeFirst();
      counts['1'] = Number(openEmailsResult?.count || 0);

      // Closed folder (id=2) - count closed/resolved emails
      const closedEmailsResult = await this.getSelect()
        .select((eb) => eb.fn.count('id').as('count'))
        .where('tenant_id', '=', tenant_id)
        .where((eb) => eb.or([eb('status', '=', 'closed'), eb('status', '=', 'resolved')]))
        .executeTakeFirst();
      counts['2'] = Number(closedEmailsResult?.count || 0);

      // Assigned to me folder (id=6) - count assigned emails
      const assignedEmailsResult = await this.getSelect()
        .select((eb) => eb.fn.count('id').as('count'))
        .where('tenant_id', '=', tenant_id)
        .where('assigned_to', 'is not', null)
        .executeTakeFirst();
      counts['6'] = Number(assignedEmailsResult?.count || 0);
    } catch (error) {
      console.warn('Error counting special folders, status column may not exist:', error);
      // If status column doesn't exist, set special folder counts to 0 or total
      const totalEmailsResult = await this.getSelect()
        .select((eb) => eb.fn.count('id').as('count'))
        .where('tenant_id', '=', tenant_id)
        .executeTakeFirst();
      const totalCount = Number(totalEmailsResult?.count || 0);

      counts['1'] = totalCount; // All Open gets all emails
      counts['2'] = 0; // Closed gets none
      counts['6'] = 0; // Assigned gets none
    }

    return counts;
  }
}
