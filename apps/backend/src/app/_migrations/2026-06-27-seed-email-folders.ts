import { Kysely, sql } from 'kysely';

// Re-seeds the required global email_folders rows that map to hardcoded folder ID constants
// in libs/common/src/lib/emails.ts.  The original migration (2026-05-24-inbox-folder.ts)
// only inserted id=11 for the first tenant and was subsequently deleted, causing FK
// violations on emails.folder_id for any DB set up after that point.
export async function up(db: Kysely<any>): Promise<void> {
  const firstTenant = await db.selectFrom('tenants').select('id').orderBy('id', 'asc').limit(1).executeTakeFirst();
  const tenantId = firstTenant ? String(firstTenant.id) : '1';

  const firstUser = await db.selectFrom('authusers').select('id').orderBy('id', 'asc').limit(1).executeTakeFirst();
  const userId = firstUser ? String(firstUser.id) : '1';

  const folders = [
    { id: '3', name: 'Sent', icon: 'paper-airplane', sort_order: 9 },
    { id: '4', name: 'Spam', icon: 'exclamation-triangle', sort_order: 11 },
    { id: '5', name: 'Trash', icon: 'trash', sort_order: 10 },
    { id: '7', name: 'Drafts', icon: 'document', sort_order: 7 },
    { id: '10', name: 'Outbox', icon: 'clock', sort_order: 8 },
    { id: '11', name: 'Inbox', icon: 'inbox', sort_order: 6 },
  ];

  for (const folder of folders) {
    await db
      .insertInto('email_folders')
      .values({
        id: folder.id,
        tenant_id: tenantId,
        name: folder.name,
        icon: folder.icon,
        sort_order: folder.sort_order,
        is_default: false,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  }

  // Advance the sequence past the manually inserted IDs so future inserts don't collide.
  await sql`SELECT setval('email_folders_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM email_folders), 12))`.execute(db);
}

export async function down(_db: Kysely<any>): Promise<void> {
  // Intentionally a no-op: removing these rows could break existing emails via FK.
}
