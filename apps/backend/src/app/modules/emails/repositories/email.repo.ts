/**
 * Data access layer for email message records.
 */
import { EmailStatus, SPECIAL_FOLDERS } from '@common';

import { UpdateResult, sql } from 'kysely';

import { BaseRepository } from '../../../lib/base.repo';
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
        .where('tenant_id', '=', tenantId)
        .where('folder_id', '=', trashId)
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
   * Handles special folders via central predicate builder.
   */
  public async getByFolder(user_id: string, tenant_id: string, folder_id: string) {
    const whereForFolder = this.buildFolderPredicate(folder_id, user_id);

    const query = this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where((eb) => whereForFolder(eb));

    return query.execute();
  }

  /**
   * Get emails by folder with attachment count and has_attachment flag.
   * LEFT JOIN subquery for counts + EXISTS for boolean.
   */
  public async getByFolderWithAttachmentFlag(user_id: string, tenant_id: string, folder_id: string) {
    const whereForFolder = this.buildFolderPredicate(folder_id, user_id);

    // Subquery: SELECT email_id, COUNT(*)::int AS att_count FROM email_attachments ... GROUP BY email_id
    const ea = this.emailAttachmentsRepo.getSelectForCountByEmails(tenant_id); // should be aliased as 'ea'

    return (
      this.getSelect()
        .selectAll()
        // numeric count (coalesced to 0)
        .select((eb) => eb.fn.coalesce(eb.ref('ea.att_count' as any), eb.val(0)).as('attachment_count'))
        // boolean has_attachment via EXISTS (fast)
        .select((eb) =>
          eb
            .exists(
              eb
                .selectFrom('email_attachments as a')
                .select('a.id')
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
   * Get email counts for all folders (real + virtual) for a tenant in ONE query.
   * Uses Postgres filtered aggregates for virtual folders.
   */
  public async getEmailCountsByFolder(user_id: string, tenant_id: string): Promise<Record<string, number>> {
    // 1) Regular per-folder counts
    const regular = await this.getSelect()
      .select(['folder_id'])
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', tenant_id)
      .groupBy('folder_id')
      .execute();

    // 2) Virtual counts (tenant-wide, not grouped)
    const virtual = await this.getSelect()
      .select(() => [
        sql<number>`count(*) filter (where status = 'open' and folder_id is distinct from ${ALL_FOLDERS.TRASH})`.as(
          'all_open',
        ),
        sql<number>`count(*) filter (where status = 'closed' and folder_id is distinct from ${ALL_FOLDERS.TRASH})`.as(
          'closed',
        ),
        sql<number>`count(*) filter (where assigned_to = ${user_id} and status = 'open' and folder_id is distinct from ${ALL_FOLDERS.TRASH})`.as(
          'assigned',
        ),
        sql<number>`count(*) filter (where assigned_to is null and status = 'open' and folder_id is distinct from ${ALL_FOLDERS.TRASH})`.as(
          'unassigned',
        ),
        sql<number>`count(*) filter (where is_favourite = true and status = 'open' and folder_id is distinct from ${ALL_FOLDERS.TRASH})`.as(
          'favourites',
        ),
      ])
      .where('tenant_id', '=', tenant_id)
      .executeTakeFirst();

    const counts: Record<string, number> = {};

    // Real folders
    for (const row of regular) {
      counts[row.folder_id as unknown as string] = Number((row as any).count ?? 0);
    }

    // Virtual folders (COALESCE to 0 if tenant has no emails)
    counts[SPECIAL_FOLDERS.ALL_OPEN] = Number((virtual as any)?.all_open ?? 0);
    counts[SPECIAL_FOLDERS.CLOSED] = Number((virtual as any)?.closed ?? 0);
    counts[SPECIAL_FOLDERS.ASSIGNED_TO_ME] = Number((virtual as any)?.assigned ?? 0);
    counts[SPECIAL_FOLDERS.UNASSIGNED] = Number((virtual as any)?.unassigned ?? 0);
    counts[SPECIAL_FOLDERS.FAVOURITES] = Number((virtual as any)?.favourites ?? 0);

    return counts;
  }

  /**
   * Get email with headers and recipients for detailed view.
   */
  public async getEmailWithHeadersAndRecipients(tenant_id: string, email_id: string) {
    const email = await this.getOneBy('id', { tenant_id, value: email_id });
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
   */
  public async hasAttachments(tenant_id: string, email_id: string): Promise<boolean> {
    return this.emailAttachmentsRepo.hasAttachment(tenant_id, email_id);
  }

  /**
   * Move emails to Trash folder and remember their original folder.
   */
  public async moveToTrash(tenant_id: string, emailIds: string[]) {
    if (!emailIds?.length) return 0;

    return this.transaction().execute(async (trx) => {
      const trashFolderId = ALL_FOLDERS.TRASH;

      // Remember provenance (skip ones already in Trash)
      await this.emailTrashRepo.addFromEmails({ tenant_id, emailIds, folder_id: trashFolderId }, trx);

      const res = (await this.getUpdate(trx)
        .set({ folder_id: trashFolderId, deleted_at: new Date() })
        .where('tenant_id', '=', tenant_id)
        .where('id', 'in', emailIds)
        .executeTakeFirst()) as unknown as UpdateResult;

      return Number(res.numUpdatedRows ?? 0);
    });
  }

  /** Restore emails from Trash back to their previous folders (joined UPDATE … FROM). */
  public async restoreFromTrash(tenantId: string, emailIds: string[]): Promise<number> {
    if (!emailIds?.length) return 0;

    return this.transaction().execute(async (trx) => {
      // UPDATE emails e
      // SET folder_id = et.from_folder_id, deleted_at = null
      // FROM email_trash et
      // WHERE e.tenant_id = et.tenant_id AND e.id = et.email_id
      //   AND e.tenant_id = :tenantId AND e.id IN (:emailIds)

      const updated = (await this.getUpdate(trx)
        .set({
          folder_id: sql`et.from_folder_id`,
          deleted_at: null,
        })
        .from('email_trash as et')
        .whereRef('et.tenant_id', '=', 'emails.tenant_id')
        .whereRef('et.email_id', '=', 'emails.id')
        .where('emails.tenant_id', '=', tenantId)
        .where('emails.id', 'in', emailIds)
        .executeTakeFirst()) as unknown as UpdateResult;

      // Clean up only the provenance rows we used
      await this.emailTrashRepo.deleteMany({ tenant_id: tenantId, ids: emailIds }, trx);

      return Number(updated?.numUpdatedRows ?? 0);
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
   */
  public async setStatus(tenant_id: string, id: string, status: EmailStatus) {
    await this.getUpdate().set({ status }).where('tenant_id', '=', tenant_id).where('id', '=', id).executeTakeFirst();
    return status;
  }

  /**
   * Central builder for folder predicates. Returns a function that applies the where clauses.
   * Kept non-async (pure) and dedupes "not in trash".
   */
  private buildFolderPredicate(folder_id: string, user_id: string): (eb: any) => any {
    switch (folder_id) {
      case SPECIAL_FOLDERS.ALL_OPEN:
        return (eb) => eb.and([eb('status', '=', 'open'), this.notInTrash(eb)]);
      case SPECIAL_FOLDERS.CLOSED:
        return (eb) => eb.and([eb('status', '=', 'closed'), this.notInTrash(eb)]);
      case SPECIAL_FOLDERS.ASSIGNED_TO_ME:
        return (eb) => eb.and([eb('assigned_to', '=', user_id), eb('status', '=', 'open'), this.notInTrash(eb)]);
      case SPECIAL_FOLDERS.UNASSIGNED:
        return (eb) => eb.and([eb('assigned_to', 'is', null), eb('status', '=', 'open'), this.notInTrash(eb)]);
      case SPECIAL_FOLDERS.FAVOURITES:
        return (eb) => eb.and([eb('is_favourite', '=', true), eb('status', '=', 'open'), this.notInTrash(eb)]);
      default:
        // Real folder
        return (eb) => eb('folder_id', '=', folder_id);
    }
  }

  // ---------- predicate builder (centralized special-folder logic) ----------

  /** small helper to avoid Trash in virtual folders */
  private notInTrash(eb: any) {
    return eb('folder_id', 'is distinct from', ALL_FOLDERS.TRASH);
  }
}
