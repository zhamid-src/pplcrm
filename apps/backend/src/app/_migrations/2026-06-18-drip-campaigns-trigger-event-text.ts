import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: drip-campaigns-trigger-event-text ========');

  // Drop foreign key constraint on trigger_event_id if it exists
  await sql`ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_trigger_event_id_fkey`.execute(db);

  // Change column type of trigger_event_id to text
  await db.schema
    .alterTable('workflows')
    .alterColumn('trigger_event_id', (col) => col.setDataType('text'))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: drip-campaigns-trigger-event-text ========');

  // Alter the column back to bigint
  await db.schema
    .alterTable('workflows')
    .alterColumn('trigger_event_id', (col) => col.setDataType('bigint'))
    .execute();

  // Re-add foreign key constraint
  await db.schema
    .alterTable('workflows')
    .addForeignKeyConstraint('workflows_trigger_event_id_fkey', ['trigger_event_id'], 'volunteer_events', ['id'], (cb) => cb.onDelete('set null'))
    .execute();
}
