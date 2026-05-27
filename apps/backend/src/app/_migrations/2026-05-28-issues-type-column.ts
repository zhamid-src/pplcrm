import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Add 'type' column with default 'tag'
  await db.schema
    .alterTable('tags')
    .addColumn('type', 'text', (col) => col.defaultTo('tag').notNull())
    .execute();

  // 2. Drop the old unique constraint (actual database constraint name is unique_tenant_tag_name)
  await db.schema
    .alterTable('tags')
    .dropConstraint('unique_tenant_tag_name')
    .execute();

  // 3. Add the new unique constraint tags_tenant_name_type_unique
  await db.schema
    .alterTable('tags')
    .addUniqueConstraint('tags_tenant_name_type_unique', ['tenant_id', 'name', 'type'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // 1. Drop the new unique constraint
  await db.schema
    .alterTable('tags')
    .dropConstraint('tags_tenant_name_type_unique')
    .execute();

  // 2. Re-create the old unique constraint
  await db.schema
    .alterTable('tags')
    .addUniqueConstraint('unique_tenant_tag_name', ['tenant_id', 'name'])
    .execute();

  // 3. Drop the 'type' column
  await db.schema
    .alterTable('tags')
    .dropColumn('type')
    .execute();
}
