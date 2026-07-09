import type { Kysely } from 'kysely';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { StorageService } from '../../../lib/storage.service';
import { env } from '../../../../env';
import crypto from 'crypto';
import { sanitizeHtml } from '../../../lib/mail/sanitize-util';
import { logger } from '../../../logger';

export interface IngestableEmail {
  id: string; // Remote provider's unique message ID
  internetMessageId?: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  subject: string | null;
  dateSent: Date;
  bodyHtml: string;
  recipients: Array<{
    kind: 'to' | 'cc' | 'bcc';
    name: string | null;
    email: string;
  }>;
  attachments: Array<{
    name: string;
    contentType: string;
    size: number;
    contentId: string | null;
    isInline: boolean;
    fetchContent: () => Promise<Buffer>;
  }>;
}

export class EmailIngesterService {
  private readonly storageService = new StorageService();

  constructor(
    private readonly db: Kysely<Models>,
    private readonly prefix: string, // 'ms' or 'google'
  ) {}

  public async removeAllLocalEmails(tenantId: string, campaignId: string): Promise<void> {
    const matchedEmails = await this.db
      .selectFrom('emails')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .where('preview', 'like', `${this.prefix}:%`)
      .execute();

    if (matchedEmails.length === 0) return;
    const emailIds = matchedEmails.map((e) => String(e.id));

    // Capture attachment file references before the rows are deleted.
    const fileIds = await this.getAttachmentFileIds(tenantId, emailIds);

    await this.db.transaction().execute(async (trx) => {
      // Delete from dependent tables sequentially to prevent foreign key constraint issues
      await trx
        .deleteFrom('email_comments')
        .where('tenant_id', '=', tenantId)
        .where('email_id', 'in', emailIds)
        .execute();
      await trx
        .deleteFrom('email_bodies')
        .where('tenant_id', '=', tenantId)
        .where('email_id', 'in', emailIds)
        .execute();
      await trx
        .deleteFrom('email_headers')
        .where('tenant_id', '=', tenantId)
        .where('email_id', 'in', emailIds)
        .execute();
      await trx
        .deleteFrom('email_recipients')
        .where('tenant_id', '=', tenantId)
        .where('email_id', 'in', emailIds)
        .execute();
      await trx
        .deleteFrom('email_attachments')
        .where('tenant_id', '=', tenantId)
        .where('email_id', 'in', emailIds)
        .execute();
      await trx.deleteFrom('email_trash').where('tenant_id', '=', tenantId).where('email_id', 'in', emailIds).execute();

      // Delete from emails table
      await trx.deleteFrom('emails').where('tenant_id', '=', tenantId).where('id', 'in', emailIds).execute();
    });

    await this.purgeOrphanedFiles(tenantId, fileIds);
  }

  public async deleteMessage(tenantId: string, campaignId: string, remoteId: string): Promise<void> {
    const dedupeKey = `${this.prefix}:${remoteId}`;
    const existing = await this.db
      .selectFrom('emails')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .where('preview', '=', dedupeKey)
      .executeTakeFirst();

    if (!existing) return;
    const emailId = String(existing.id);

    // Capture attachment file references before the rows are deleted.
    const fileIds = await this.getAttachmentFileIds(tenantId, [emailId]);

    await this.db.transaction().execute(async (trx) => {
      // Delete from dependent tables sequentially to prevent foreign key constraint issues
      await trx
        .deleteFrom('email_comments')
        .where('tenant_id', '=', tenantId)
        .where('email_id', '=', emailId)
        .execute();
      await trx.deleteFrom('email_bodies').where('tenant_id', '=', tenantId).where('email_id', '=', emailId).execute();
      await trx.deleteFrom('email_headers').where('tenant_id', '=', tenantId).where('email_id', '=', emailId).execute();
      await trx
        .deleteFrom('email_recipients')
        .where('tenant_id', '=', tenantId)
        .where('email_id', '=', emailId)
        .execute();
      await trx
        .deleteFrom('email_attachments')
        .where('tenant_id', '=', tenantId)
        .where('email_id', '=', emailId)
        .execute();
      await trx.deleteFrom('email_trash').where('tenant_id', '=', tenantId).where('email_id', '=', emailId).execute();

      // Delete from emails table
      await trx.deleteFrom('emails').where('tenant_id', '=', tenantId).where('id', '=', emailId).execute();
    });

    await this.purgeOrphanedFiles(tenantId, fileIds);
  }

  /** Distinct, non-null file_ids referenced by the given emails' attachments. */
  private async getAttachmentFileIds(tenantId: string, emailIds: string[]): Promise<string[]> {
    if (emailIds.length === 0) return [];
    const rows = await this.db
      .selectFrom('email_attachments')
      .select('file_id')
      .distinct()
      .where('tenant_id', '=', tenantId)
      .where('email_id', 'in', emailIds)
      .where('file_id', 'is not', null)
      .execute();
    return rows.map((r) => String(r.file_id)).filter((id) => id !== 'null');
  }

  /**
   * Delete file rows + storage blobs for files no longer referenced by any
   * remaining attachment (files are sha256-deduped and can be shared). Storage
   * deletion is best-effort and must not throw.
   */
  private async purgeOrphanedFiles(tenantId: string, fileIds: string[]): Promise<void> {
    for (const fileId of fileIds) {
      try {
        const stillReferenced = await this.db
          .selectFrom('email_attachments')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('file_id', '=', fileId)
          .limit(1)
          .executeTakeFirst();

        if (stillReferenced) continue;

        const file = await this.db
          .selectFrom('files')
          .select(['id', 'storage_key'])
          .where('tenant_id', '=', tenantId)
          .where('id', '=', fileId)
          .executeTakeFirst();

        if (!file) continue;

        await this.db.deleteFrom('files').where('tenant_id', '=', tenantId).where('id', '=', fileId).execute();

        if (file.storage_key) {
          try {
            await this.storageService.delete(file.storage_key);
          } catch (err) {
            logger.error({ err }, `Failed to delete storage blob ${file.storage_key} for file ${fileId}`);
          }
        }
      } catch (err) {
        logger.error({ err }, `Failed to purge orphaned file ${fileId}`);
      }
    }
  }

  public async ingestEmail(
    email: IngestableEmail,
    tenantId: string,
    campaignId: string,
    requestedBy: string,
    folderId: string,
  ): Promise<boolean> {
    const dedupeKey = `${this.prefix}:${email.id}`;

    // Dedup: use remote message ID stored in email preview field (prefixed).
    // Scoped to the campaign so the same mailbox connected under two contexts
    // ingests into each context's Inbox independently (§15).
    const existing = await this.db
      .selectFrom('emails')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .where('preview', '=', dedupeKey)
      .executeTakeFirst();

    if (existing) return false;

    // Try finding by internetMessageId in email_headers to match locally composed
    // & sent emails. The provider may reassign a message's ID when it moves
    // between folders (e.g. MS Graph changes the ID on Drafts -> Sent), so the
    // preview-based dedup above can miss the local copy. The Message-ID header is
    // stable across that move, so use it as a folder-aware fallback.
    if (email.internetMessageId) {
      const matches = await this.db
        .selectFrom('emails')
        .innerJoin('email_headers', 'email_headers.email_id', 'emails.id')
        .select(['emails.id as id', 'emails.folder_id as folder_id', 'emails.preview as preview'])
        .where('emails.tenant_id', '=', tenantId)
        .where('emails.campaign_id', '=', campaignId)
        .where('email_headers.tenant_id', '=', tenantId)
        .where('email_headers.raw_headers', 'like', `%Message-ID: ${email.internetMessageId}%`)
        .execute();

      // 1. Same message already present in THIS folder. This is the same item
      //    re-synced (possibly under a new provider ID) — refresh the dedupe key
      //    so future syncs match by preview, and skip insertion.
      const sameFolder = matches.find((m) => String(m.folder_id) === String(folderId));
      if (sameFolder) {
        if (sameFolder.preview !== dedupeKey) {
          await this.db
            .updateTable('emails')
            .set({ preview: dedupeKey, updated_at: new Date() })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', String(sameFolder.id))
            .execute();
        }
        return false;
      }

      // 2. An untagged (locally composed, not yet provider-tagged) copy exists in
      //    another folder — claim it: tag with the provider ID and align its folder.
      const untagged = matches.find((m) => !(m.preview?.startsWith('ms:') || m.preview?.startsWith('google:')));
      if (untagged) {
        await this.db
          .updateTable('emails')
          .set({ preview: dedupeKey, folder_id: folderId, updated_at: new Date() })
          .where('tenant_id', '=', tenantId)
          .where('id', '=', String(untagged.id))
          .execute();

        return false; // prevent duplicate insertion
      }

      // 3. Otherwise the message only exists in other folders and is already
      //    provider-tagged — this is a genuine cross-folder copy (e.g.
      //    send-to-self in both Sent and Inbox). Fall through and insert fresh.
    }

    // Upload attachment files to storage outside database transaction

    const uploadResults = await Promise.all(
      email.attachments.map(async (att) => {
        try {
          const buffer = await att.fetchContent();
          const sha256_hex = crypto.createHash('sha256').update(buffer).digest('hex');
          const fileUUID = crypto.randomUUID();
          const storage_key = `emails/attachments/${fileUUID}_${att.name}`;

          await this.storageService.upload(storage_key, buffer, att.contentType);

          return {
            filename: att.name,
            content_type: att.contentType,
            size_bytes: att.size,
            storage_key,
            sha256_hex,
            cid: att.contentId,
            is_inline: att.isInline,
          };
        } catch (err) {
          logger.error({ err }, `Failed to upload attachment ${att.name} for message ${email.id} to storage`);
          return null;
        }
      }),
    );

    const uploadedFiles = uploadResults.filter((f): f is NonNullable<typeof f> => f !== null);

    return this.db.transaction().execute(async (trx) => {
      // 1. Insert into emails
      const emailRow = await trx
        .insertInto('emails')
        .values({
          tenant_id: tenantId,
          campaign_id: campaignId,
          folder_id: folderId,
          from_email: email.fromEmail,
          to_email: email.toEmail,
          subject: email.subject,
          preview: dedupeKey, // store ID as dedup key
          assigned_to: null,
          is_favourite: false,
          deleted_at: null,
          status: 'open',
          createdby_id: requestedBy,
          updatedby_id: requestedBy,
        })
        .returningAll()
        .executeTakeFirst();

      if (!emailRow) return false;

      const emailId = String(emailRow.id);

      // 2. Rewrite inline CID references in body content, then insert body
      let bodyHtml = sanitizeHtml(email.bodyHtml);
      for (const file of uploadedFiles) {
        if (file.is_inline && file.cid) {
          const cidEscaped = file.cid.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`src=['"]cid:${cidEscaped}['"]`, 'gi');
          bodyHtml = bodyHtml.replace(regex, `src="${env.apiUrl}/api/emails/${emailId}/attachments/cid/${file.cid}"`);
        }
      }

      await trx
        .insertInto('email_bodies')
        .values({
          tenant_id: tenantId,
          email_id: emailId,
          body_html: bodyHtml,
          createdby_id: requestedBy,
          updatedby_id: requestedBy,
        })
        .execute();

      // 3. Insert files and email_attachments metadata
      for (const [i, file] of uploadedFiles.entries()) {
        let fileId: string;

        // Persist (or reuse, via sha256 dedup) the file row, then link the
        // attachment to it so downloads can resolve the stored blob.
        const existingFile = await trx
          .selectFrom('files')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('sha256_hex', '=', file.sha256_hex)
          .executeTakeFirst();

        if (existingFile) {
          fileId = String(existingFile.id);
        } else {
          const fileResult = await trx
            .insertInto('files')
            .values({
              tenant_id: tenantId,
              filename: file.filename,
              mime_type: file.content_type,
              size_bytes: file.size_bytes,
              storage_key: file.storage_key,
              sha256_hex: file.sha256_hex,
              uploaded_by: requestedBy,
            })
            .returning('id')
            .executeTakeFirstOrThrow();
          fileId = String(fileResult.id);
        }

        await trx
          .insertInto('email_attachments')
          .values({
            tenant_id: tenantId,
            email_id: emailId,
            filename: file.filename,
            content_type: file.content_type,
            size_bytes: file.size_bytes,
            cid: file.cid,
            is_inline: file.is_inline,
            pos: i + 1,
            file_id: fileId,
            createdby_id: requestedBy,
            updatedby_id: requestedBy,
          })
          .execute();
      }

      // 4. Insert headers
      const internetMessageId = email.internetMessageId ?? '';
      const rawHeaders = `Message-ID: ${internetMessageId}\r\nSubject: ${email.subject ?? ''}\r\nFrom: ${email.fromEmail ?? ''}\r\nTo: ${email.toEmail ?? ''}\r\nDate: ${email.dateSent.toUTCString()}\r\n`;

      await trx
        .insertInto('email_headers')
        .values({
          tenant_id: tenantId,
          email_id: emailId,
          headers_json: JSON.stringify({ internetMessageId }),
          raw_headers: rawHeaders,
          date_sent: email.dateSent,
          createdby_id: requestedBy,
          updatedby_id: requestedBy,
        })
        .execute();

      // 5. Insert recipients
      if (email.recipients.length > 0) {
        const recipientRows = email.recipients.map((r, i) => ({
          tenant_id: tenantId,
          email_id: emailId,
          kind: r.kind,
          name: r.name,
          email: r.email,
          pos: i,
          createdby_id: requestedBy,
          updatedby_id: requestedBy,
        }));
        await trx.insertInto('email_recipients').values(recipientRows).execute();
      }

      return true;
    });
  }
}
