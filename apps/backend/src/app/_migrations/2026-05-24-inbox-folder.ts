import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: 2026-05-24-inbox-folder ========');

  const tenants = await db.selectFrom('tenants').select('id').execute();
  const firstTenant = tenants[0];
  const firstTenantId = firstTenant ? String(firstTenant.id) : '1';

  for (const tenant of tenants) {
    const tenantId = String(tenant.id);
    let folderId: string;

    if (tenantId === firstTenantId) {
      // Ensure the 'Inbox' folder (ID 11) exists in email_folders for the first tenant
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
      folderId = '11';
    } else {
      // For other tenants, check if an Inbox folder already exists
      const existingFolder = await db
        .selectFrom('email_folders')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('name', '=', 'Inbox')
        .executeTakeFirst();

      if (existingFolder) {
        folderId = String(existingFolder.id);
      } else {
        const result = await db
          .insertInto('email_folders')
          .values({
            tenant_id: tenantId,
            name: 'Inbox',
            createdby_id: '1',
            updatedby_id: '1',
            icon: 'inbox',
            sort_order: 0,
            is_default: false,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        folderId = String(result.id);
      }
    }

    // Update emails with folder_id = '1' to folderId for this specific tenant
    await db
      .updateTable('emails')
      .set({ folder_id: folderId })
      .where('tenant_id', '=', tenantId)
      .where('folder_id', '=', '1')
      .execute();
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: 2026-05-24-inbox-folder ========');

  // Find all Inbox folders in the database
  const inboxFolders = await db
    .selectFrom('email_folders')
    .select(['id', 'tenant_id'])
    .where('name', '=', 'Inbox')
    .execute();

  for (const folder of inboxFolders) {
    const folderId = String(folder.id);
    const tenantId = String(folder.tenant_id);

    // Revert emails from this Inbox folder back to folder_id = '1' for this tenant
    await db
      .updateTable('emails')
      .set({ folder_id: '1' })
      .where('tenant_id', '=', tenantId)
      .where('folder_id', '=', folderId)
      .execute();

    // Delete 'Inbox' folder
    await db.deleteFrom('email_folders').where('id', '=', folderId).execute();
  }
}
