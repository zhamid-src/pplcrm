import { Kysely, sql } from 'kysely';

const SYSTEM_TAG_COLOURS: Record<string, string> = {
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

const SYSTEM_TAG_SEED_DATA = [
  'volunteer',
  'donor',
  'supporter',
  'non-supporter',
  'undecided',
  'subscriber',
  'unsubscribed',
  'do-not-contact',
  'staff',
  'vip',
].map((name) => ({ name, description: null as string | null, color: SYSTEM_TAG_COLOURS[name] ?? null }));

export async function down(db: Kysely<any>): Promise<void> {
  const names = SYSTEM_TAG_SEED_DATA.map((tag) => tag.name);
  if (!names.length) return;

  await db
    .updateTable('tags')
    .set({ deletable: true, color: null, updated_at: sql`now()` as any })
    .where('name', 'in', names as any)
    .execute();
}

export async function up(db: Kysely<any>): Promise<void> {
  const tenants = await db.selectFrom('tenants').select(['id', 'admin_id', 'createdby_id']).execute();

  for (const tenant of tenants) {
    const tenantId = tenant.id;
    if (!tenantId) continue;

    let actorId = tenant.admin_id ?? tenant.createdby_id ?? null;

    if (!actorId) {
      const fallbackUser = await db
        .selectFrom('authusers')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .orderBy('id')
        .executeTakeFirst();
      actorId = fallbackUser?.id ?? null;
    }

    if (!actorId) {
      // Without an associated user we cannot satisfy not-null constraints.
      continue;
    }

    for (const seed of SYSTEM_TAG_SEED_DATA) {
      const existing = await db
        .selectFrom('tags')
        .select(['id', 'deletable', 'color'])
        .where('tenant_id', '=', tenantId)
        .where('name', '=', seed.name)
        .executeTakeFirst();

      if (!existing) {
        await db
          .insertInto('tags')
          .values({
            tenant_id: tenantId,
            name: seed.name,
            description: seed.description,
            color: seed.color,
            deletable: false,
            createdby_id: actorId,
            updatedby_id: actorId,
          })
          .execute();
        continue;
      }

      const desiredColor = seed.color;
      const needsDeletableUpdate = existing.deletable !== false;
      const needsColorUpdate = existing.color !== desiredColor;

      if (needsDeletableUpdate || needsColorUpdate) {
        await db
          .updateTable('tags')
          .set({
            ...(needsDeletableUpdate ? { deletable: false } : {}),
            ...(needsColorUpdate ? { color: desiredColor } : {}),
            updatedby_id: actorId,
            updated_at: sql`now()` as any,
          })
          .where('id', '=', existing.id)
          .execute();
      }
    }
  }
}
