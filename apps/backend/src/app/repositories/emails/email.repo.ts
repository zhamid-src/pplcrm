/**
 * Data access layer for email message records.
 */
import { StringReference } from 'kysely';

import { BaseRepository } from '../base.repo';
import { EmailAttachmentsRepo } from './email-attachments.repo';
import { EmailHeadersRepo } from './email-headers.repo';
import { EmailRecipientsRepo } from './email-recipients.repo';
import { Models } from 'common/src/lib/kysely.models';

/**
 * Repository for the `emails` table.
 */
export class EmailRepo extends BaseRepository<'emails'> {
  private emailAttachmentsRepo = new EmailAttachmentsRepo();
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
  public async getByFolder(user_id: string, tenant_id: string, folder_id: string) {
    const whereForFolder = await this.buildFolderPredicate(folder_id, user_id);

    const query = this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where((eb) => whereForFolder(eb));

    return query.execute();
  }

  /** Example: list emails in a folder with an `attachment_count` field */
  public async getByFolderWithAttachmentFlag(user_id: string, tenant_id: string, folder_id: string) {
    const whereForFolder = await this.buildFolderPredicate(folder_id, user_id);
    const ea = this.emailAttachmentsRepo.getSelectForCountByEmails(tenant_id); // aliased 'ea'

    return this.getSelect()
      .selectAll()
      .select((eb) =>
        eb.fn.coalesce(eb.ref('ea.att_count' as StringReference<Models, 'emails'>), eb.val(0)).as('attachment_count'),
      )
      .leftJoin(ea, 'ea.email_id', 'emails.id')
      .where('tenant_id', '=', tenant_id)
      .where((eb) => whereForFolder(eb))
      .execute();
  }

  /**
   * Get email counts for all folders for a given tenant.
   * Includes virtual folders using the same predicate builder as getByFolder.
   *
   * @param tenant_id - Tenant that owns the emails.
   * @returns Object mapping folder_id to email count.
   */
  public async getEmailCountsByFolder(user_id: string, tenant_id: string): Promise<Record<string, number>> {
    // 1) Regular folder counts (group by folder_id)
    const regular = await this.getSelect()
      .select(['folder_id'])
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', tenant_id)
      .groupBy('folder_id')
      .execute();

    const counts: Record<string, number> = {};
    for (const row of regular) counts[row.folder_id] = Number(row.count);

    // 2) Virtual folder counts via the same predicate builder (no duplicated logic)
    const [allOpenPred, closedPred, assignedPred, unAssignedPred, favouritesPred] = await Promise.all([
      this.buildFolderPredicate(SPECIAL.ALL_OPEN, user_id),
      this.buildFolderPredicate(SPECIAL.CLOSED, user_id),
      this.buildFolderPredicate(SPECIAL.ASSIGNED_TO_ME, user_id),
      this.buildFolderPredicate(SPECIAL.UNASSIGNED, user_id),
      this.buildFolderPredicate(SPECIAL.FAVOURITES, user_id),
    ]);

    const [allOpenCount, closedCount, assignedCount, unAssignedCount, favouritesCount] = await Promise.all([
      this.getSelect()
        .select((eb) => eb.fn.count('id').as('count'))
        .where('tenant_id', '=', tenant_id)
        .where((eb) => allOpenPred(eb))
        .executeTakeFirst(),
      this.getSelect()
        .select((eb) => eb.fn.count('id').as('count'))
        .where('tenant_id', '=', tenant_id)
        .where((eb) => closedPred(eb))
        .executeTakeFirst(),
      this.getSelect()
        .select((eb) => eb.fn.count('id').as('count'))
        .where('tenant_id', '=', tenant_id)
        .where((eb) => assignedPred(eb))
        .executeTakeFirst(),
      this.getSelect()
        .select((eb) => eb.fn.count('id').as('count'))
        .where('tenant_id', '=', tenant_id)
        .where((eb) => unAssignedPred(eb))
        .executeTakeFirst(),
      this.getSelect()
        .select((eb) => eb.fn.count('id').as('count'))
        .where('tenant_id', '=', tenant_id)
        .where((eb) => favouritesPred(eb))
        .executeTakeFirst(),
    ]);

    counts[SPECIAL.ALL_OPEN] = Number(allOpenCount?.count || 0);
    counts[SPECIAL.CLOSED] = Number(closedCount?.count || 0);
    counts[SPECIAL.ASSIGNED_TO_ME] = Number(assignedCount?.count || 0);
    counts[SPECIAL.UNASSIGNED] = Number(unAssignedCount?.count || 0);
    counts[SPECIAL.FAVOURITES] = Number(favouritesCount?.count || 0);

    // Optional: debug
    // console.log('Final folder counts:', counts);
    return counts;
  }

  /**
   * Get email with headers and recipients for detailed view.
   * Combines email, headers, and recipients using separate queries for type-safety.
   *
   * @param tenant_id - Tenant that owns the email.
   * @param email_id - Identifier of the email to fetch.
   * @returns Email with headers and categorized recipients.
   */
  public async getEmailWithHeadersAndRecipients(tenant_id: string, email_id: string) {
    const email = await this.getById({ tenant_id, id: email_id });
    if (!email) return null;

    const emailHeaders = await this.emailHeadersRepo.getByEmailId(tenant_id, email_id);

    const [toRecipients, ccRecipients, bccRecipients] = await Promise.all([
      this.emailRecipientsRepo.getByEmailIdAndKind(tenant_id, email_id, 'to'),
      this.emailRecipientsRepo.getByEmailIdAndKind(tenant_id, email_id, 'cc'),
      this.emailRecipientsRepo.getByEmailIdAndKind(tenant_id, email_id, 'bcc'),
    ]);

    return {
      ...email,
      headers_json: emailHeaders?.headers_json ?? null,
      raw_headers: emailHeaders?.raw_headers ?? null,
      date_sent: emailHeaders?.date_sent ?? null,
      to_list: toRecipients,
      cc_list: ccRecipients,
      bcc_list: bccRecipients,
    };
  }

  /** One-off check */
  public async hasAttachments(tenant_id: string, email_id: string): Promise<boolean> {
    return this.emailAttachmentsRepo.hasAttachment(tenant_id, email_id);
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
   * Update the status of an email.
   *
   * @param tenant_id - Tenant that owns the email.
   * @param id - Email ID to update.
   * @param status - New status ('open', 'closed', 'resolved').
   * @returns The updated status.
   */
  public async setStatus(tenant_id: string, id: string, status: EmailStatus) {
    await this.getUpdate().set({ status }).where('tenant_id', '=', tenant_id).where('id', '=', id).executeTakeFirst();

    return status;
  }

  /**
   * Central builder for folder predicates. Returns a function that applies the where clauses.
   * This keeps special-folder logic in a single place and reusable across queries.
   */
  private async buildFolderPredicate(folder_id: string, user_id: string): Promise<(eb: any) => any> {
    const hasStatus = await this.supportsStatusColumn();

    // Virtual folders
    if (folder_id === SPECIAL.ALL_OPEN) {
      if (hasStatus) {
        return (eb: any) => eb.or([eb('status', '=', 'open'), eb('status', 'is', null)]);
      }
      // If no status column, "All Open" ≈ everything
      return (_eb: any) => true;
    }

    if (folder_id === SPECIAL.CLOSED) {
      if (hasStatus) {
        return (eb: any) => eb.or([eb('status', '=', 'closed'), eb('status', '=', 'resolved')]);
      }
      // If no status column, "Closed" ≈ nothing
      return (_eb: any) => false;
    }

    if (folder_id === SPECIAL.ASSIGNED_TO_ME) {
      if (hasStatus) {
        return (eb: any) => eb.and([eb('assigned_to', '=', user_id), eb('status', '=', 'open')]);
      }
      // If no status column, just "assigned to me"
      return (eb: any) => eb('assigned_to', '=', user_id);
    }

    if (folder_id === SPECIAL.UNASSIGNED) {
      if (hasStatus) {
        return (eb: any) => eb.and([eb('assigned_to', 'is distinct from', user_id), eb('status', '=', 'open')]);
      }
      // If no status column, just "assigned to me"
      return (eb: any) => eb('assigned_to', 'is distinct from', user_id);
    }

    if (folder_id === SPECIAL.FAVOURITES) {
      if (hasStatus) {
        return (eb: any) => eb.and([eb('is_favourite', '=', true), eb('status', '=', 'open')]);
      }
      return (eb: any) => eb('is_favourite', '=', true);
    }

    // Real folder
    return (eb: any) => eb('folder_id', '=', folder_id);
  }

  /**
   * Quick capability check: does the `emails.status` column exist?
   * We try a harmless filtered query; if it errors, we assume column is missing.
   */
  private async supportsStatusColumn(): Promise<boolean> {
    try {
      // Use a tiny query with a status predicate; limit to avoid touching many rows.
      await this.getSelect()
        .select((eb) => eb.val(1).as('ok'))
        .where((eb) => eb.or([eb('status', '=', 'open'), eb('status', 'is', null)]))
        .limit(1)
        .execute();
      return true;
    } catch {
      return false;
    }
  }
}

type EmailStatus = 'open' | 'closed' | 'resolved';

const SPECIAL = {
  ALL_OPEN: '1',
  CLOSED: '2',
  ASSIGNED_TO_ME: '6',
  UNASSIGNED: '8',
  FAVOURITES: '9',
} as const;
