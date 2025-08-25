/**
 * Data access layer for email message records.
 */
import { EmailStatus, SPECIAL_FOLDERS } from '@common';

import { UpdateResult, sql } from 'kysely';

import { BaseRepository } from '../base.repo';
import { EmailAttachmentsRepo } from './email-attachments.repo';
import { EmailHeadersRepo } from './email-headers.repo';
import { EmailRecipientsRepo } from './email-recipients.repo';
import { EmailTrashRepo } from './email-trash.repo';
import { ALL_FOLDERS } from 'common/src/lib/emails';

/**
 * Repository for the `emails` table.
 */
export class EmailRepo extends BaseRepository<'emails'> {
  private emailAttachmentsRepo = new EmailAttachmentsRepo();
  private emailHeadersRepo = new EmailHeadersRepo();
  private emailRecipientsRepo = new EmailRecipientsRepo();
  private emailTrashRepo = new EmailTrashRepo();

  /**
   * Creates a repository instance for the `emails` table.
   */
  constructor() {
    super('emails');
  }

  /** Permanently remove everything in the tenant's Trash folder. */
  public async emptyTrash(tenantId: string) {
    return this.transaction().execute(async (trx) => {
      const trashId = ALL_FOLDERS.TRASH;

      const res = await this.getDelete(trx)
        .where('tenant_id', '=', tenantId as any)
        .where('folder_id', '=', trashId as any)
        .executeTakeFirst();

      // email_trash rows should be cleaned via FK ON DELETE CASCADE
      return Number(res.numDeletedRows ?? 0);
    });
  }

  public async getAttachmentsByEmailId(tenant_id: string, email_id: string) {
    return this.emailAttachmentsRepo.getByEmailId(tenant_id, email_id);
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

  /**
   * Get emails by folder with attachment count and has_attachment flag.
   * Uses a subquery to count attachments per email.
   *
   * @param user_id - User ID for folder-specific logic.
   * @param tenant_id - Tenant that owns the emails.
   * @param folder_id - Identifier of the folder to retrieve emails from.
   * @returns List of emails with attachment info.
   */
  public async getByFolderWithAttachmentFlag(user_id: string, tenant_id: string, folder_id: string) {
    const whereForFolder = await this.buildFolderPredicate(folder_id, user_id);

    // Subquery ea: { email_id, att_count }
    const ea = this.emailAttachmentsRepo.getSelectForCountByEmails(tenant_id); // aliased 'ea'

    return (
      this.getSelect()
        .selectAll()
        // numeric count (coalesced to 0)
        .select((eb) =>
          eb.fn
            // NOTE: ea.att_count (not ea.attachment_count)
            .coalesce(eb.ref('ea.att_count' as any /* StringReference<Models, 'emails'> */), eb.val(0))
            .as('attachment_count'),
        )
        // boolean has_attachment via EXISTS (faster than COUNT)
        .select((eb) =>
          eb
            .exists(
              eb
                .selectFrom('email_attachments as a')
                .select('a.id') // any column works inside EXISTS
                .whereRef('a.tenant_id', '=', 'emails.tenant_id')
                .whereRef('a.email_id', '=', 'emails.id'),
            )
            .as('has_attachment'),
        )
        .leftJoin(ea, 'ea.email_id', 'emails.id')
        .where('tenant_id', '=', tenant_id)
        .where((eb) => whereForFolder(eb))
        .execute()
    );
  }

  public async getByIdsInFolder(tenant_id: string, emailIds: string[], folder_id: string) {
    if (!emailIds?.length) return [];
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('folder_id', '=', folder_id)
      .where('id', 'in', emailIds)
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

    // TODO: any opportunity to optimize this?

    // 2) Virtual folder counts via the same predicate builder (no duplicated logic)
    const [allOpenPred, closedPred, assignedPred, unAssignedPred, favouritesPred] = await Promise.all([
      this.buildFolderPredicate(SPECIAL_FOLDERS.ALL_OPEN, user_id),
      this.buildFolderPredicate(SPECIAL_FOLDERS.CLOSED, user_id),
      this.buildFolderPredicate(SPECIAL_FOLDERS.ASSIGNED_TO_ME, user_id),
      this.buildFolderPredicate(SPECIAL_FOLDERS.UNASSIGNED, user_id),
      this.buildFolderPredicate(SPECIAL_FOLDERS.FAVOURITES, user_id),
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

    counts[SPECIAL_FOLDERS.ALL_OPEN] = Number(allOpenCount?.count || 0);
    counts[SPECIAL_FOLDERS.CLOSED] = Number(closedCount?.count || 0);
    counts[SPECIAL_FOLDERS.ASSIGNED_TO_ME] = Number(assignedCount?.count || 0);
    counts[SPECIAL_FOLDERS.UNASSIGNED] = Number(unAssignedCount?.count || 0);
    counts[SPECIAL_FOLDERS.FAVOURITES] = Number(favouritesCount?.count || 0);

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

  /**
   * Check if an email has any attachments.
   * Uses a subquery to check for existence of attachments.
   *
   * @param tenant_id - Tenant that owns the email.
   * @param email_id - Identifier of the email to check.
   * @returns True if the email has attachments, false otherwise.
   */
  public async hasAttachments(tenant_id: string, email_id: string): Promise<boolean> {
    return this.emailAttachmentsRepo.hasAttachment(tenant_id, email_id);
  }

  /**
   * Move emails to Trash folder and remember their original folder.
   * Uses a transaction to ensure atomicity.
   *
   * @param tenant_id - Tenant that owns the emails.
   * @param emailIds - List of email IDs to move to Trash.
   * @returns Number of emails moved to Trash.
   */
  public async moveToTrash(tenant_id: string, emailIds: string[]) {
    if (!emailIds?.length) return 0;

    return this.transaction().execute(async (trx) => {
      const folder_id = ALL_FOLDERS.TRASH;

      // Remember where each email came from (skip ones already in Trash)
      await this.emailTrashRepo.addFromEmails({ tenant_id, emailIds, folder_id }, trx);

      const res = (await this.getUpdate(trx)
        .set({ folder_id: folder_id, deleted_at: new Date() })
        .where('tenant_id', '=', tenant_id)
        .where('id', 'in', emailIds)
        .executeTakeFirst()) as unknown as UpdateResult;

      return Number(res.numUpdatedRows ?? 0);
    });
  }

  /** Restore emails from Trash back to their previous folders. */
  public async restoreFromTrash(tenantId: string, emailIds: string[]): Promise<number> {
    if (!emailIds?.length) return Promise.resolve(0);

    return this.transaction().execute(async (trx) => {
      // Update emails by pulling the original folder from email_trash (per email)
      const updated = await this.getUpdate(trx)
        .set({
          // If from_folder_id is TEXT, CAST to BIGINT. Keep current folder if no trash row exists.
          folder_id: sql<string>`
          COALESCE(
            CAST((
              SELECT et.from_folder_id
              FROM email_trash AS et
              WHERE et.tenant_id = emails.tenant_id
                AND et.email_id  = emails.id
            ) AS bigint),
            folder_id
          )
        `,
          deleted_at: null, // or trashed_at: null if that’s your field
        })
        .where('tenant_id', '=', tenantId)
        .where('id', 'in', emailIds as any) // ensure ids match your DB type
        .executeTakeFirst();

      // Clean up provenance rows
      await this.emailTrashRepo.deleteMany({ tenant_id: tenantId, ids: emailIds }, trx);

      return Number((updated as any)?.numUpdatedRows ?? 0);
    });
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
   * @param status - New status ('open', 'closed').
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
    // Virtual folders
    if (folder_id === SPECIAL_FOLDERS.ALL_OPEN)
      return (eb) => eb.and([eb('status', '=', 'open'), eb('folder_id', 'is distinct from', ALL_FOLDERS.TRASH)]);
    else if (folder_id === SPECIAL_FOLDERS.CLOSED)
      return (eb) => eb.and([eb('status', '=', 'closed'), eb('folder_id', 'is distinct from', ALL_FOLDERS.TRASH)]);
    else if (folder_id === SPECIAL_FOLDERS.ASSIGNED_TO_ME)
      return (eb) =>
        eb.and([
          eb('assigned_to', '=', user_id),
          eb('status', '=', 'open'),
          eb('folder_id', 'is distinct from', ALL_FOLDERS.TRASH),
        ]);
    else if (folder_id === SPECIAL_FOLDERS.UNASSIGNED)
      return (eb) =>
        eb.and([
          eb('assigned_to', 'is', null),
          eb('status', '=', 'open'),
          eb('folder_id', 'is distinct from', ALL_FOLDERS.TRASH),
        ]);
    else if (folder_id === SPECIAL_FOLDERS.FAVOURITES)
      return (eb) =>
        eb.and([
          eb('is_favourite', '=', true),
          eb('status', '=', 'open'),
          eb('folder_id', 'is distinct from', ALL_FOLDERS.TRASH),
        ]);
    // Real folder
    else return (eb) => eb('folder_id', '=', folder_id);
  }
}
