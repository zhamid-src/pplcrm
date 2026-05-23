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

/** Map of Microsoft folder display names → pplcrm folder IDs */
const MS_FOLDER_MAP: Record<string, string> = {
  Inbox: ALL_FOLDERS.ALL_OPEN,
  'Sent Items': ALL_FOLDERS.SENT,
  Drafts: ALL_FOLDERS.DRAFTS,
  'Deleted Items': ALL_FOLDERS.TRASH,
  'Junk Email': ALL_FOLDERS.SPAM,
};

const FALLBACK_FOLDER = ALL_FOLDERS.ALL_OPEN;
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

    // Get MS folder name → pplcrm folder mapping via the user's real folder list
    const folderMap = await this.buildFolderMap(client);

    const deltaLink = await this.oauthSvc.getDeltaLink(userId);

    let url = deltaLink ?? `/me/mailFolders/inbox/messages/delta?$top=${MAX_MESSAGES_PER_SYNC}&$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,body,receivedDateTime,hasAttachments,parentFolderId,internetMessageId&$orderby=receivedDateTime+desc`;

    let inserted = 0;
    let nextDeltaLink: string | null = null;

    try {
      const response: any = await client.api(url).get();
      const messages: any[] = response.value ?? [];
      nextDeltaLink = response['@odata.deltaLink'] ?? response['@odata.nextLink'] ?? null;

      for (const msg of messages) {
        const wasSaved = await this.saveMessage(client, msg, userId, tenantId, requestedBy, folderMap);
        if (wasSaved) inserted++;
      }

      if (nextDeltaLink) {
        await this.oauthSvc.saveDeltaLink(userId, nextDeltaLink);
      }
    } catch (err: any) {
      // If delta link expired, clear it and retry with a full sync next time
      if (err?.statusCode === 410) {
        await this.oauthSvc.saveDeltaLink(userId, '');
      }
      throw err;
    }

    return { inserted };
  }

  /** Builds a map from MS folder ID → pplcrm folder ID */
  private async buildFolderMap(client: Client): Promise<Record<string, string>> {
    try {
      const response: any = await client.api('/me/mailFolders').get();
      const folders: any[] = response.value ?? [];
      const map: Record<string, string> = {};
      for (const folder of folders) {
        const pplcrmId = MS_FOLDER_MAP[folder.displayName as string] ?? FALLBACK_FOLDER;
        map[folder.id] = pplcrmId;
      }
      return map;
    } catch {
      return {};
    }
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
    folderMap: Record<string, string>,
  ): Promise<boolean> {
    const msId: string = msg.id ?? '';
    if (!msId) return false;

    // Dedup: use ms message ID stored in email preview field (prefixed)
    const dedupeKey = `ms:${msId}`;
    const existing = await this.db
      .selectFrom('emails')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('preview', '=', dedupeKey)
      .executeTakeFirst();

    if (existing) return false;

    const folderId = folderMap[msg.parentFolderId] ?? FALLBACK_FOLDER;
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
          const cidEscaped = file.cid.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
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
