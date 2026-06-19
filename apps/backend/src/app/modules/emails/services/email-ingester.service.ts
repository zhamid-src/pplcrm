/**
 * @file Shared service for email ingestion.
 * Handles database transaction insertion and uploading email attachments to Azure Storage.
 * Shared by both MsSyncService and GoogleSyncService to avoid code duplication.
 */
import { Kysely } from 'kysely';
import { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { StorageService } from '../../../lib/storage.service';
import { env } from '../../../../env';
import crypto from 'crypto';

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

  /**
   * Deletes all local emails synced from this provider for this tenant.
   */
  public async removeAllLocalEmails(tenantId: string): Promise<void> {
    const matchedEmails = await this.db
      .selectFrom('emails')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('preview', 'like', `${this.prefix}:%`)
      .execute();

    if (matchedEmails.length === 0) return;
    const emailIds = matchedEmails.map((e) => String(e.id));

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
        .deleteFrom('email_attachments' as any)
        .where('tenant_id', '=', tenantId)
        .where('email_id', 'in', emailIds)
        .execute();
      await trx
        .deleteFrom('email_trash' as any)
        .where('tenant_id', '=', tenantId)
        .where('email_id', 'in', emailIds)
        .execute();

      // Delete from emails table
      await trx.deleteFrom('emails').where('tenant_id', '=', tenantId).where('id', 'in', emailIds).execute();
    });
  }

  /**
   * Safely deletes a synced email and all its dependent child tables
   * by its provider-prefixed deduplication key.
   */
  public async deleteMessage(tenantId: string, remoteId: string): Promise<void> {
    const dedupeKey = `${this.prefix}:${remoteId}`;
    const existing = await this.db
      .selectFrom('emails')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('preview', '=', dedupeKey)
      .executeTakeFirst();

    if (!existing) return;
    const emailId = String(existing.id);

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
        .deleteFrom('email_attachments' as any)
        .where('tenant_id', '=', tenantId)
        .where('email_id', '=', emailId)
        .execute();
      await trx
        .deleteFrom('email_trash' as any)
        .where('tenant_id', '=', tenantId)
        .where('email_id', '=', emailId)
        .execute();

      // Delete from emails table
      await trx.deleteFrom('emails').where('tenant_id', '=', tenantId).where('id', '=', emailId).execute();
    });
  }

  /**
   * Persists an email into the emails tables.
   * Skips duplicates detected by the remote message ID stored in `preview`.
   * Returns true if a new email was inserted.
   */
  public async ingestEmail(
    email: IngestableEmail,
    tenantId: string,
    requestedBy: string,
    folderId: string,
  ): Promise<boolean> {
    const dedupeKey = `${this.prefix}:${email.id}`;

    // Dedup: use remote message ID stored in email preview field (prefixed)
    const existing = await this.db
      .selectFrom('emails')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('preview', '=', dedupeKey)
      .executeTakeFirst();

    if (existing) return false;

    // Try finding by internetMessageId in email_headers to match locally composed & sent emails
    if (email.internetMessageId) {
      const headerRow = await this.db
        .selectFrom('email_headers')
        .select('email_id')
        .where('tenant_id', '=', tenantId)
        .where('raw_headers', 'like', `%Message-ID: ${email.internetMessageId}%`)
        .executeTakeFirst();

      if (headerRow) {
        const matchedEmail = await this.db
          .selectFrom('emails')
          .select(['id', 'folder_id'])
          .where('tenant_id', '=', tenantId)
          .where('id', '=', String(headerRow.email_id))
          .executeTakeFirst();

        if (matchedEmail) {
          // Found matching email. Update it with the remote message ID dedupeKey and set to correct folder
          await this.db
            .updateTable('emails')
            .set({
              preview: dedupeKey,
              folder_id: folderId, // align to synced folder (e.g. Sent folder '3')
              updated_at: new Date(),
            })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', String(matchedEmail.id))
            .execute();

          return false; // prevent duplicate insertion
        }
      }
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
          console.error(`Failed to upload attachment ${att.name} for message ${email.id} to storage:`, err);
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
      let bodyHtml = email.bodyHtml;
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
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        let fileId: string;

        const existingFile = await trx
          .selectFrom('files' as any)
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('sha256_hex', '=', file.sha256_hex)
          .executeTakeFirst();

        if (existingFile) {
          fileId = String((existingFile as any).id);
        } else {
          const fileResult = await trx
            .insertInto('files' as any)
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
            .executeTakeFirst();

          fileId = String((fileResult as any).id);
        }

        await trx
          .insertInto('email_attachments' as any)
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
