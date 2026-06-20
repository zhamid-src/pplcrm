import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // Column may already exist if run fresh; ignore errors gracefully.
  try {
    await db.schema
      .alterTable('households')
      .addColumn('is_placeholder', 'boolean', (col) => col.notNull().defaultTo(false))
      .execute();
  } catch {
    // Column already exists — that's fine.
  }
}

export async function down(db: Kysely<any>) {
  try {
    await db.schema.alterTable('households').dropColumn('is_placeholder').execute();
  } catch {
    // Column may not exist.
  }
}
