import { Kysely, sql } from 'kysely';

/**
 * Adds a partial unique index on persons(tenant_id, lower(email))
 * so that no two people within the same tenant can share the same email address.
 * The index is partial (WHERE email IS NOT NULL AND email <> '') so blank emails are allowed.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Use a raw SQL statement because Kysely's schema builder doesn't support
  // expression indexes (lower(email)) or partial WHERE clauses directly.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_persons_tenant_email_unique
    ON persons (tenant_id, lower(email))
    WHERE email IS NOT NULL AND trim(email) <> ''
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_persons_tenant_email_unique').ifExists().execute();
}
