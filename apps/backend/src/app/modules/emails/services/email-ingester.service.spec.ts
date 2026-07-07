import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseRepository } from '../../../lib/base.repo';
import { EmailIngesterService, type IngestableEmail } from './email-ingester.service';

// Integration tests for sync de-duplication against locally composed/sent emails.
//
// Microsoft Graph reassigns a message's ID when it moves between folders
// (e.g. Drafts -> Sent), so the optimistically-saved local copy and the
// copy pulled back by sync have different provider IDs. The stable
// internetMessageId header is used to reconcile them. These tests guard
// against the duplicate-in-Sent regression and preserve the send-to-self
// (Sent + Inbox) behaviour.
describe('EmailIngesterService dedup (integration)', () => {
  const db = (BaseRepository as any)._db;
  const rand = () => String(Math.floor(Math.random() * 100000000) + 10000000);
  let tenantId: string;
  let userId: string;
  let ingester: EmailIngesterService;

  const SENT = '3';
  const INBOX = '11';

  beforeEach(async () => {
    tenantId = rand();
    userId = rand();
    ingester = new EmailIngesterService(db, 'ms');

    await db.insertInto('tenants').values({ id: tenantId, name: 'Test Tenant' }).execute();
    await db
      .insertInto('authusers')
      .values({
        id: userId,
        tenant_id: tenantId,
        email: `user-${userId}@example.com`,
        password: 'password',
        first_name: 'Test',
        last_name: 'User',
        verified: true,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();
  });

  afterEach(async () => {
    for (const table of ['email_recipients', 'email_attachments', 'email_headers', 'email_bodies']) {
      await db.deleteFrom(table).where('tenant_id', '=', tenantId).execute();
    }
    await db.deleteFrom('emails').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
  });

  // Mirrors what the send route persists: a local copy in Sent tagged with the
  // draft's provider ID, with the stable Message-ID in email_headers.
  async function seedLocalSentEmail(internetMessageId: string, draftId: string) {
    const created = await db
      .insertInto('emails')
      .values({
        tenant_id: tenantId,
        folder_id: SENT,
        from_email: `user-${userId}@example.com`,
        to_email: 'external@gmail.com',
        subject: 'Hello',
        preview: `ms:${draftId}`,
        assigned_to: userId,
        is_favourite: false,
        status: 'open',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await db
      .insertInto('email_headers')
      .values({
        tenant_id: tenantId,
        email_id: String(created.id),
        headers_json: JSON.stringify({ internetMessageId }),
        raw_headers: `Message-ID: ${internetMessageId}\r\nSubject: Hello\r\n`,
        date_sent: new Date(),
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    return String(created.id);
  }

  function makeIngestable(internetMessageId: string, providerId: string): IngestableEmail {
    return {
      id: providerId,
      internetMessageId,
      fromEmail: `user-${userId}@example.com`,
      toEmail: 'external@gmail.com',
      subject: 'Hello',
      dateSent: new Date(),
      bodyHtml: '<p>Hello</p>',
      recipients: [{ kind: 'to', name: null, email: 'external@gmail.com' }],
      attachments: [],
    };
  }

  const countByFolder = async (folderId: string) => {
    const rows = await db
      .selectFrom('emails')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('folder_id', '=', folderId)
      .execute();
    return rows.length;
  };

  it('does not duplicate a sent email when sync returns it under a new provider ID', async () => {
    const imid = `<${rand()}@example.com>`;
    await seedLocalSentEmail(imid, 'DRAFT_ID');

    // Sync pulls the Sent item back with a DIFFERENT provider ID.
    const inserted = await ingester.ingestEmail(makeIngestable(imid, 'SENT_ID'), tenantId, userId, SENT);

    expect(inserted).toBe(false); // reconciled, not inserted
    expect(await countByFolder(SENT)).toBe(1);

    // The local copy's dedupe key should be refreshed to the new provider ID
    // so subsequent syncs match by preview directly.
    const refreshed = await db
      .selectFrom('emails')
      .select('preview')
      .where('tenant_id', '=', tenantId)
      .where('folder_id', '=', SENT)
      .executeTakeFirst();
    expect(refreshed?.preview).toBe('ms:SENT_ID');
  });

  it('is idempotent across repeated syncs of the same sent item', async () => {
    const imid = `<${rand()}@example.com>`;
    await seedLocalSentEmail(imid, 'DRAFT_ID');

    await ingester.ingestEmail(makeIngestable(imid, 'SENT_ID'), tenantId, userId, SENT);
    await ingester.ingestEmail(makeIngestable(imid, 'SENT_ID'), tenantId, userId, SENT);
    await ingester.ingestEmail(makeIngestable(imid, 'SENT_ID_2'), tenantId, userId, SENT);

    expect(await countByFolder(SENT)).toBe(1);
  });

  it('keeps a single copy per folder for send-to-self (Sent + Inbox)', async () => {
    const imid = `<${rand()}@example.com>`;
    await seedLocalSentEmail(imid, 'DRAFT_ID');

    // Same message comes back from Sent and Inbox (each with its own provider ID).
    await ingester.ingestEmail(makeIngestable(imid, 'SENT_ID'), tenantId, userId, SENT);
    await ingester.ingestEmail(makeIngestable(imid, 'INBOX_ID'), tenantId, userId, INBOX);

    expect(await countByFolder(SENT)).toBe(1);
    expect(await countByFolder(INBOX)).toBe(1);
  });

  it('handles send-to-self when Inbox is synced before Sent', async () => {
    const imid = `<${rand()}@example.com>`;
    await seedLocalSentEmail(imid, 'DRAFT_ID');

    await ingester.ingestEmail(makeIngestable(imid, 'INBOX_ID'), tenantId, userId, INBOX);
    await ingester.ingestEmail(makeIngestable(imid, 'SENT_ID'), tenantId, userId, SENT);

    expect(await countByFolder(SENT)).toBe(1);
    expect(await countByFolder(INBOX)).toBe(1);
  });
});
