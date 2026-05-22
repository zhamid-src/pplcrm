import { Kysely } from 'kysely';

/**
 * STUB — this migration was executed locally then superseded before being committed.
 * The is_placeholder column it originally added is removed by 2025-09-16-tenants-placeholder-household.
 * Keeping this file here so Kysely's migration table stays consistent.
 */
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
