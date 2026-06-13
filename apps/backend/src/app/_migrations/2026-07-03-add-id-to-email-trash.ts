import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: add id primary key to email_trash ========');
  
  // 1. Drop existing composite primary key
  await db.schema
    .alterTable('email_trash')
    .dropConstraint('email_trash_pkey')
    .execute();

  // 2. Add id primary key column
  await db.schema
    .alterTable('email_trash')
    .addColumn('id', 'bigserial', (col) => col.primaryKey().unique())
    .execute();

  // 3. Re-create uniqueness constraint for tenant_id + email_id
  await db.schema
    .createIndex('idx_email_trash_tenant_email_unique')
    .on('email_trash')
    .columns(['tenant_id', 'email_id'])
    .unique()
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: remove id primary key from email_trash ========');

  // 1. Drop unique index
  await db.schema
    .dropIndex('idx_email_trash_tenant_email_unique')
    .ifExists()
    .execute();

  // 2. Drop id column
  await db.schema
    .alterTable('email_trash')
    .dropColumn('id')
    .execute();

  // 3. Restore composite primary key
  await db.schema
    .alterTable('email_trash')
    .addPrimaryKeyConstraint('email_trash_pkey', ['tenant_id', 'email_id'])
    .execute();
}
