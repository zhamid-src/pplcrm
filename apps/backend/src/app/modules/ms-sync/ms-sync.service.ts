/**
 * @file Microsoft Graph email sync service.
 * Fetches emails from the Microsoft Graph API and ingests them into the
 * existing emails / email_bodies / email_headers / email_recipients tables.
 */
import { Client } from '@microsoft/microsoft-graph-client';
import { Kysely } from 'kysely';
import { Models } from 'common/src/lib/kysely.models';
import { MsOAuthService } from './ms-oauth.service';
import { ALL_FOLDERS } from 'common/src/lib/emails';
import { StorageService } from '../../lib/storage.service';
import { env } from '../../../env';
import crypto from 'crypto';

const MAX_MESSAGES_PER_SYNC = 50;

/**
 * Service that pulls emails from Microsoft Graph API and stores them
 * in the existing pplcrm email tables.
 */
export class MsSyncService {
  private readonly storageService = new StorageService();

  constructor(
    private readonly db: Kysely<Models>,
    private readonly oauthSvc: MsOAuthService,
  ) {}

  /**
   * Performs an incremental sync for a user.
   * Uses the delta link (if available) to only fetch new/changed messages.
   *
   * @returns Number of new emails inserted
   */
  public async syncUser(userId: string, tenantId: string, requestedBy: string): Promise<{ inserted: number }> {
    const accessToken = await this.oauthSvc.getValidToken(userId);
    const client = this.buildGraphClient(accessToken);

    // Query active email folders for this tenant from database to prevent foreign key issues
    const dbFolders: any[] = await (this.db as any)
      .selectFrom('email_folders')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .execute();
    const allowedFolderIds = new Set(dbFolders.map((f: any) => String(f.id)));

    const syncFolders = [
      { wellKnownName: 'inbox', pplcrmId: ALL_FOLDERS.INBOX },
      { wellKnownName: 'sentitems', pplcrmId: ALL_FOLDERS.SENT },
      { wellKnownName: 'deleteditems', pplcrmId: ALL_FOLDERS.TRASH },
      { wellKnownName: 'junkemail', pplcrmId: ALL_FOLDERS.SPAM },
    ].filter(f => allowedFolderIds.has(f.pplcrmId));

    // Read stored delta map
    const dbDeltaLink = await this.oauthSvc.getDeltaLink(userId);
    let deltaMap: Record<string, string> = {};
    if (dbDeltaLink) {
      try {
        deltaMap = JSON.parse(dbDeltaLink);
      } catch {
        // If not valid JSON, it's a legacy plain URL string. Clear it.
        deltaMap = {};
      }
    }

    let inserted = 0;
    const nextDeltaMap: Record<string, string> = { ...deltaMap };

    for (const folder of syncFolders) {
      const folderDeltaLink = deltaMap[folder.wellKnownName] || null;
      let pageUrl: string | null = folderDeltaLink ?? `/me/mailFolders/${folder.wellKnownName}/messages/delta?$top=${MAX_MESSAGES_PER_SYNC}&$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,body,receivedDateTime,hasAttachments,parentFolderId,internetMessageId`;

      const allMessages: any[] = [];
      let isInitialSync = (folderDeltaLink === null);
      let hasMore = true;

      while (pageUrl && hasMore) {
        try {
          const response: any = await client.api(pageUrl).get();
          const messages = response.value ?? [];
          allMessages.push(...messages);

          const nextLink = response['@odata.nextLink'] ?? null;
          const deltaLink = response['@odata.deltaLink'] ?? null;

          if (deltaLink) {
            nextDeltaMap[folder.wellKnownName] = deltaLink;
            hasMore = false;
          } else if (nextLink) {
            pageUrl = nextLink;
          } else {
            hasMore = false;
          }
        } catch (err: any) {
          if (err?.statusCode === 410) {
            // Delta link expired for this folder, clear it
            delete nextDeltaMap[folder.wellKnownName];
            isInitialSync = true;
            allMessages.length = 0; // clear any partially loaded pages before restarting
            pageUrl = `/me/mailFolders/${folder.wellKnownName}/messages/delta?$top=${MAX_MESSAGES_PER_SYNC}&$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,body,receivedDateTime,hasAttachments,parentFolderId,internetMessageId`;
          } else {
            throw err;
          }
        }
      }

      // Process all messages fetched in this sync run
      for (const msg of allMessages) {
        if (msg['@removed']) {
          const msId = msg.id;
          if (msId) {
            const dedupeKey = `ms:${msId}`;
            await this.deleteMessage(tenantId, dedupeKey);
          }
          continue;
        }
        const wasSaved = await this.saveMessage(client, msg, userId, tenantId, requestedBy, folder.pplcrmId);
        if (wasSaved) inserted++;
      }

      // If it was an initial/full sync (meaning we started with no delta link, or it expired and we retried),
      // we have retrieved the entire list of active server messages.
      // Therefore, any local email that has an MS preview key but is NOT in the server's list must have been deleted or moved.
      if (isInitialSync) {
        const serverMsIds = new Set(allMessages.filter(m => !m['@removed']).map(m => String(m.id)));
        const localEmails = await this.db
          .selectFrom('emails')
          .select(['id', 'preview'])
          .where('tenant_id', '=', tenantId)
          .where('folder_id', '=', folder.pplcrmId)
          .where('preview', 'like', 'ms:%')
          .execute();

        for (const localEmail of localEmails) {
          const previewKey = localEmail.preview ?? '';
          const msId = previewKey.replace(/^ms:/, '');
          if (!serverMsIds.has(msId)) {
            await this.deleteMessage(tenantId, previewKey);
          }
        }
      }
    }

    // Save updated delta map back to database
    await this.oauthSvc.saveDeltaLink(userId, JSON.stringify(nextDeltaMap));

    return { inserted };
  }

  /**
   * Deletes all local emails synced from MS Graph for this tenant.
   */
  public async removeAllLocalEmails(tenantId: string): Promise<void> {
    const msEmails = await this.db
      .selectFrom('emails')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('preview', 'like', 'ms:%')
      .execute();

    if (msEmails.length === 0) return;
    const emailIds = msEmails.map((e) => String(e.id));

    await this.db.transaction().execute(async (trx) => {
      // Delete from dependent tables sequentially to prevent foreign key constraint issues
      await trx.deleteFrom('email_comments').where('tenant_id', '=', tenantId).where('email_id', 'in', emailIds).execute();
      await trx.deleteFrom('email_bodies').where('tenant_id', '=', tenantId).where('email_id', 'in', emailIds).execute();
      await trx.deleteFrom('email_headers').where('tenant_id', '=', tenantId).where('email_id', 'in', emailIds).execute();
      await trx.deleteFrom('email_recipients').where('tenant_id', '=', tenantId).where('email_id', 'in', emailIds).execute();
      await trx.deleteFrom('email_attachments' as any).where('tenant_id', '=', tenantId).where('email_id', 'in', emailIds).execute();
      await trx.deleteFrom('email_trash' as any).where('tenant_id', '=', tenantId).where('email_id', 'in', emailIds).execute();

      // Delete from emails table
      await trx.deleteFrom('emails').where('tenant_id', '=', tenantId).where('id', 'in', emailIds).execute();
    });
  }

  /**
   * Safely deletes a synced email and all its dependent child tables
   * by its MS deduplication key (stored in `preview`).
   */
  private async deleteMessage(tenantId: string, dedupeKey: string): Promise<void> {
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
      await trx.deleteFrom('email_comments').where('tenant_id', '=', tenantId).where('email_id', '=', emailId).execute();
      await trx.deleteFrom('email_bodies').where('tenant_id', '=', tenantId).where('email_id', '=', emailId).execute();
      await trx.deleteFrom('email_headers').where('tenant_id', '=', tenantId).where('email_id', '=', emailId).execute();
      await trx.deleteFrom('email_recipients').where('tenant_id', '=', tenantId).where('email_id', '=', emailId).execute();
      await trx.deleteFrom('email_attachments' as any).where('tenant_id', '=', tenantId).where('email_id', '=', emailId).execute();
      await trx.deleteFrom('email_trash' as any).where('tenant_id', '=', tenantId).where('email_id', '=', emailId).execute();

      // Delete from emails table
      await trx.deleteFrom('emails').where('tenant_id', '=', tenantId).where('id', '=', emailId).execute();
    });
  }

  /**
   * Persists a single Graph message into the emails tables.
   * Skips duplicates detected by the MS message ID stored in `preview`.
   * Returns true if a new email was inserted.
   */
  private async saveMessage(
    client: Client,
    msg: any,
    _userId: string,
    tenantId: string,
    requestedBy: string,
    folderId: string,
  ): Promise<boolean> {
    const msId: string = msg.id ?? '';
    if (!msId) return false;

    // Dedup: use ms message ID stored in email preview field (prefixed)
    const dedupeKey = `ms:${msId}`;
    let existing = await this.db
      .selectFrom('emails')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('preview', '=', dedupeKey)
      .executeTakeFirst();

    if (existing) return false;

    // Try finding by internetMessageId in email_headers to match locally composed & sent emails
    const internetMessageId = msg.internetMessageId ?? '';
    if (internetMessageId) {
      const headerRow = await this.db
        .selectFrom('email_headers')
        .select('email_id')
        .where('tenant_id', '=', tenantId)
        .where('raw_headers', 'like', `%Message-ID: ${internetMessageId}%`)
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

    const fromEmail = msg.from?.emailAddress?.address ?? null;
    const toEmail = msg.toRecipients?.[0]?.emailAddress?.address ?? null;
    const subject = msg.subject ?? null;
    const dateSent = msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date();

    // Fetch Graph attachments if any
    let graphAttachments: any[] = [];
    const hasCid = msg.body?.content && msg.body.content.includes('cid:');
    if (msg.hasAttachments || hasCid) {
      try {
        const attRes = await client.api(`/me/messages/${msId}/attachments`).get();
        graphAttachments = attRes.value ?? [];
      } catch (err) {
        console.error(`Failed to fetch attachments for message ${msId}:`, err);
      }
    }

    const fileAttachments = graphAttachments.filter(
      (att: any) => att['@odata.type'] === '#microsoft.graph.fileAttachment' && att.contentBytes,
    );

    // Upload attachment files to storage outside database transaction
    const uploadedFiles: Array<{
      filename: string;
      content_type: string;
      size_bytes: number;
      storage_key: string;
      sha256_hex: string;
      cid: string | null;
      is_inline: boolean;
    }> = [];

    for (const att of fileAttachments) {
      try {
        const buffer = Buffer.from(att.contentBytes, 'base64');
        const sha256_hex = crypto.createHash('sha256').update(buffer).digest('hex');
        const fileUUID = crypto.randomUUID();
        const storage_key = `emails/attachments/${fileUUID}_${att.name}`;

        await this.storageService.upload(storage_key, buffer, att.contentType);

        uploadedFiles.push({
          filename: att.name,
          content_type: att.contentType,
          size_bytes: att.size,
          storage_key,
          sha256_hex,
          cid: att.contentId ?? null,
          is_inline: att.isInline ?? false,
        });
      } catch (err) {
        console.error(`Failed to upload attachment ${att.name} for message ${msId} to storage:`, err);
      }
    }

    return this.db.transaction().execute(async (trx) => {
      // 1. Insert into emails
      const emailRow = await trx
        .insertInto('emails')
        .values({
          tenant_id: tenantId,
          folder_id: folderId,
          from_email: fromEmail,
          to_email: toEmail,
          subject: subject,
          preview: dedupeKey,   // store MS ID as dedup key
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
      let bodyHtml = msg.body?.content ?? '';
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
      const internetMessageId = msg.internetMessageId ?? '';
      const rawHeaders = `Message-ID: ${internetMessageId}\r\nSubject: ${subject ?? ''}\r\nFrom: ${fromEmail ?? ''}\r\nTo: ${toEmail ?? ''}\r\nDate: ${dateSent.toUTCString()}\r\n`;

      await trx
        .insertInto('email_headers')
        .values({
          tenant_id: tenantId,
          email_id: emailId,
          headers_json: JSON.stringify({ internetMessageId }),
          raw_headers: rawHeaders,
          date_sent: dateSent,
          createdby_id: requestedBy,
          updatedby_id: requestedBy,
        })
        .execute();

      // 5. Insert recipients
      const recipientRows: any[] = [];
      const toList: any[] = msg.toRecipients ?? [];
      const ccList: any[] = msg.ccRecipients ?? [];
      const bccList: any[] = msg.bccRecipients ?? [];

      toList.forEach((r: any, i: number) => {
        recipientRows.push({ tenant_id: tenantId, email_id: emailId, kind: 'to', name: r.emailAddress?.name ?? null, email: r.emailAddress?.address ?? '', pos: i });
      });
      ccList.forEach((r: any, i: number) => {
        recipientRows.push({ tenant_id: tenantId, email_id: emailId, kind: 'cc', name: r.emailAddress?.name ?? null, email: r.emailAddress?.address ?? '', pos: i });
      });
      bccList.forEach((r: any, i: number) => {
        recipientRows.push({ tenant_id: tenantId, email_id: emailId, kind: 'bcc', name: r.emailAddress?.name ?? null, email: r.emailAddress?.address ?? '', pos: i });
      });

      if (recipientRows.length > 0) {
        await trx.insertInto('email_recipients').values(recipientRows).execute();
      }

      return true;
    });
  }

  /** Builds an authenticated Microsoft Graph client */
  private buildGraphClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }
}
