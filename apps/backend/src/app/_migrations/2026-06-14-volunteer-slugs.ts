/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: volunteer_events slug column ========');

  // 1. Add slug column as nullable text
  await db.schema
    .alterTable('volunteer_events')
    .addColumn('slug', 'text')
    .execute();

  // 2. Backfill existing events
  const events = await db.selectFrom('volunteer_events').select(['id', 'name']).execute();
  for (const event of events) {
    let baseSlug = event.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!baseSlug) baseSlug = 'event';
    
    // Append ID to ensure global uniqueness for backfilled events
    let slug = `${baseSlug}-${event.id}`;
    
    await db.updateTable('volunteer_events')
      .set({ slug })
      .where('id', '=', event.id)
      .execute();
  }

  // 3. Add unique constraint and set column to not null
  await sql`ALTER TABLE volunteer_events ALTER COLUMN slug SET NOT NULL`.execute(db);

  await db.schema
    .alterTable('volunteer_events')
    .addUniqueConstraint('volunteer_events_slug_unique', ['slug'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: volunteer_events slug column =======');

  await db.schema
    .alterTable('volunteer_events')
    .dropConstraint('volunteer_events_slug_unique')
    .execute();

  await db.schema
    .alterTable('volunteer_events')
    .dropColumn('slug')
    .execute();
}
