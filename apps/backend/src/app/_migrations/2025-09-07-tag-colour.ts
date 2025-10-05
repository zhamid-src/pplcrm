import { Kysely, sql } from 'kysely';

const TAG_COLOURS: Record<string, string> = {
  volunteer: '#0ea5e9',
  donor: '#f97316',
  supporter: '#10b981',
  'non-supporter': '#f87171',
  undecided: '#a855f7',
  subscriber: '#14b8a6',
  unsubscribed: '#6b7280',
  'do-not-contact': '#111827',
  staff: '#2563eb',
  vip: '#facc15',
};

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('tags').addColumn('color', 'varchar(7)').execute();

  for (const [name, color] of Object.entries(TAG_COLOURS)) {
    await db
      .updateTable('tags')
      .set({ color, updated_at: sql`now()` as any })
      .where('name', '=', name)
      .execute();
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('tags').dropColumn('color').execute();
}
