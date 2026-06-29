/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '@microsoft/microsoft-graph-client';
import type { Kysely } from 'kysely';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import type { MsOAuthService } from './ms-oauth.service';
import { ALL_FOLDERS } from '../../../../../../libs/common/src/lib/emails';
import type { IngestableEmail } from '../emails/services/email-ingester.service';
import { EmailIngesterService } from '../emails/services/email-ingester.service';
import { logger } from '../../logger';

const MAX_MESSAGES_PER_SYNC = 50;

async function graphCallWithRetry<T>(callFn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await callFn();
    } catch (err: any) {
      if (err?.statusCode === 429 && attempt <= maxRetries) {
        let delayMs = 5000;
        const retryAfter = err?.headers?.get?.('Retry-After') || err?.headers?.['retry-after'];
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed)) {
            delayMs = parsed * 1000;
          }
        } else {
          delayMs = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s...
        }
        logger.warn(`MS Graph API rate limited (429). Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
}

export class MsSyncService {
  private readonly ingester: EmailIngesterService;

  constructor(
    private readonly db: Kysely<Models>,
    private readonly oauthSvc: MsOAuthService,
  ) {
    this.ingester = new EmailIngesterService(db, 'ms');
  }

  public async syncTenant(tenantId: string, requestedBy: string): Promise<{ inserted: number }> {
    const accessToken = await this.oauthSvc.getValidToken(tenantId);
    const client = this.buildGraphClient(accessToken);

    const syncFolders = [
      { wellKnownName: 'inbox', pplcrmId: ALL_FOLDERS.INBOX },
      { wellKnownName: 'sentitems', pplcrmId: ALL_FOLDERS.SENT },
      { wellKnownName: 'deleteditems', pplcrmId: ALL_FOLDERS.TRASH },
      { wellKnownName: 'junkemail', pplcrmId: ALL_FOLDERS.SPAM },
    ];

    // Read stored delta map.
    // A sentinel value { _needs_full_sync: true } signals that all folders must be fully resynced
    // (set on reconnect or after removeAllLocalEmails). saveDeltaLink overwrites it with real
    // positions after a successful sync, so no explicit clear is needed.
    const dbDeltaLink = await this.oauthSvc.getDeltaLink(tenantId);
    let deltaMap: Record<string, string> = {};
    if (dbDeltaLink) {
      try {
        const parsed = JSON.parse(dbDeltaLink);
        if (!parsed._needs_full_sync) {
          deltaMap = parsed;
        }
        // _needs_full_sync → leave deltaMap empty, triggering a full sync for every folder
      } catch {
        // If not valid JSON, it's a legacy plain URL string. Clear it.
        deltaMap = {};
      }
    }

    let inserted = 0;
    const nextDeltaMap: Record<string, string> = { ...deltaMap };

    for (const folder of syncFolders) {
      const folderDeltaLink = deltaMap[folder.wellKnownName] || null;

      let pageUrl: string | null =
        folderDeltaLink ??
        `/me/mailFolders/${folder.wellKnownName}/messages/delta?$top=${MAX_MESSAGES_PER_SYNC}&$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,body,receivedDateTime,hasAttachments,parentFolderId,internetMessageId`;

      const allMessages: any[] = [];
      let isInitialSync = folderDeltaLink === null;
      let hasMore = true;

      while (pageUrl && hasMore) {
        const url = pageUrl;
        try {
          const response: any = await graphCallWithRetry(() => client.api(url).get());
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
            await this.ingester.deleteMessage(tenantId, msId);
          }
          continue;
        }

        try {
          const wasSaved = await this.saveMessage(client, msg, tenantId, requestedBy, folder.pplcrmId);
          if (wasSaved) inserted++;
        } catch (err) {
          logger.error({ err }, `Failed to ingest MS Graph message ${msg.id}`);
        }
      }

      // If it was an initial/full sync (meaning we started with no delta link, or it expired and we retried),
      // we have retrieved the entire list of active server messages.
      // Therefore, any local email that has an MS preview key but is NOT in the server's list must have been deleted or moved.
      if (isInitialSync) {
        const serverMsIds = new Set(allMessages.filter((m) => !m['@removed']).map((m) => String(m.id)));
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
            await this.ingester.deleteMessage(tenantId, msId);
          }
        }
      }
    }

    // Save updated delta map back to database
    await this.oauthSvc.saveDeltaLink(tenantId, JSON.stringify(nextDeltaMap));

    return { inserted };
  }

  public async removeAllLocalEmails(tenantId: string): Promise<void> {
    await this.ingester.removeAllLocalEmails(tenantId);
  }

  private async saveMessage(
    client: Client,
    msg: any,
    tenantId: string,
    requestedBy: string,
    folderId: string,
  ): Promise<boolean> {
    const msId: string = msg.id ?? '';
    if (!msId) return false;

    const fromEmail = msg.from?.emailAddress?.address ?? null;
    const toEmail = msg.toRecipients?.[0]?.emailAddress?.address ?? null;
    const subject = msg.subject ?? null;
    let dateSent = msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date();
    if (isNaN(dateSent.getTime())) {
      dateSent = new Date();
    }
    const bodyHtml = msg.body?.content ?? '';

    // Fetch Graph attachments if any
    let graphAttachments: any[] = [];
    const hasCid = bodyHtml && bodyHtml.includes('cid:');
    if (msg.hasAttachments || hasCid) {
      try {
        const attRes = await graphCallWithRetry(() => client.api(`/me/messages/${msId}/attachments`).get());
        graphAttachments = attRes.value ?? [];
      } catch (err) {
        logger.error({ err }, `Failed to fetch attachments for message ${msId}`);
      }
    }

    const fileAttachments = graphAttachments.filter(
      (att: any) => att['@odata.type'] === '#microsoft.graph.fileAttachment' && att.contentBytes,
    );

    // Map MS Graph attachments to IngestableEmail attachments
    const attachments = fileAttachments.map((att: any) => ({
      name: att.name,
      contentType: att.contentType,
      size: att.size,
      contentId: att.contentId ?? null,
      isInline: att.isInline ?? false,
      fetchContent: async () => Buffer.from(att.contentBytes, 'base64'),
    }));

    // Map recipients
    const recipients: Array<{ kind: 'to' | 'cc' | 'bcc'; name: string | null; email: string }> = [];
    const toList: any[] = msg.toRecipients ?? [];
    const ccList: any[] = msg.ccRecipients ?? [];
    const bccList: any[] = msg.bccRecipients ?? [];

    toList.forEach((r) => {
      recipients.push({ kind: 'to', name: r.emailAddress?.name ?? null, email: r.emailAddress?.address ?? '' });
    });
    ccList.forEach((r) => {
      recipients.push({ kind: 'cc', name: r.emailAddress?.name ?? null, email: r.emailAddress?.address ?? '' });
    });
    bccList.forEach((r) => {
      recipients.push({ kind: 'bcc', name: r.emailAddress?.name ?? null, email: r.emailAddress?.address ?? '' });
    });

    const ingestable: IngestableEmail = {
      id: msId,
      internetMessageId: msg.internetMessageId ?? null,
      fromEmail,
      toEmail,
      subject,
      dateSent,
      bodyHtml,
      recipients,
      attachments,
    };

    return this.ingester.ingestEmail(ingestable, tenantId, requestedBy, folderId);
  }

  private buildGraphClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }
}
