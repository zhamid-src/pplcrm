import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: 2026-05-24-inbox-folder ========');

  const firstTenant = await db.selectFrom('tenants').select('id').limit(1).executeTakeFirst();
  const tenantId = firstTenant ? String(firstTenant.id) : '1';

  // Ensure the 'Inbox' folder (ID 11) exists in email_folders globally
  await db
    .insertInto('email_folders')
    .values({
      id: '11',
      tenant_id: tenantId,
      name: 'Inbox',
      createdby_id: '1',
      updatedby_id: '1',
      icon: 'inbox',
      sort_order: 0,
      is_default: false,
    })
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  // Update all emails with folder_id = '1' to folder_id = '11'
  await db
    .updateTable('emails')
    .set({ folder_id: '11' })
    .where('folder_id', '=', '1')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: 2026-05-24-inbox-folder ========');

  // Revert emails from folder_id = '11' back to folder_id = '1'
  await db
    .updateTable('emails')
    .set({ folder_id: '1' })
    .where('folder_id', '=', '11')
    .execute();

  // Delete 'Inbox' folder (ID 11)
  await db.deleteFrom('email_folders').where('id', '=', '11').execute();
}
