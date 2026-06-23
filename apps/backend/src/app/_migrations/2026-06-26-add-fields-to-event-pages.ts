import { Kysely } from 'kysely';

const DEFAULT_FIELDS = JSON.stringify(['first_name', 'last_name', 'email', 'mobile', 'notes']);

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('events')
    .addColumn('fields', 'jsonb', (col) => col.notNull().defaultTo(DEFAULT_FIELDS))
    .execute();

  await db.schema
    .alterTable('volunteer_events')
    .addColumn('fields', 'jsonb', (col) => col.notNull().defaultTo(DEFAULT_FIELDS))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('events').dropColumn('fields').execute();
  await db.schema.alterTable('volunteer_events').dropColumn('fields').execute();
}
