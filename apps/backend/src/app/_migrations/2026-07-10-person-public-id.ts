import { randomBytes } from 'node:crypto';

import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Persons switch from a name slug to an opaque public_id (spec §1 security
 * surface). At 100k+ people, name slugs collide (`amira-hassan-4787`), leak
 * counts, and put real names in URLs/logs — bad for a political CRM. Households
 * and companies KEEP their name slugs; this migration touches persons only.
 *
 * `public_id` = 8 Crockford Base32 chars (40 CSPRNG bits, `randomBytes(5)`),
 * stored uppercase-canonical (e.g. `4T9K2XPM`), unique per tenant via a partial
 * index that mirrors events_tenant_slug_unique's shape. The existing `slug`
 * column is repurposed to the URL display form `{name}-{xxxx}-{xxxx}` — the name
 * is decorative, resolution is by public_id (see lib/person-public-id.ts and the
 * shared decode helpers in @common). Pattern notes: docs/RECORD-SLUGS.md.
 *
 * The encode/slug helpers below are INLINED (not imported from @common): a
 * migration is loaded by Kysely's FileMigrationProvider via bare node ESM,
 * outside the app bundle, so it can only import packages (`kysely`) and node
 * builtins — an extensionless local import fails to resolve. The canonical,
 * unit-tested implementations live in `libs/common/src/lib/public-id.ts`; keep
 * these copies byte-for-byte in sync with them (`encodeCrockford` /
 * `buildPersonSlug` / `slugifyRecordName`).
 *
 * The backfill needs per-row random values with uniqueness, so it runs in JS:
 * per tenant, seed an in-memory used-set from any existing ids, then for each
 * remaining person generate a unique id (retrying against the set) and UPDATE
 * its public_id + slug in batches. Runs under the table's FORCE ROW LEVEL
 * SECURITY with no `app.tenant_id` GUC set — the tenant policy's
 * `NULLIF(...) IS NULL` escape permits every row, and 0001_baseline strips
 * `SET row_security = off`, so the writes reach all rows without any RLS toggle.
 */

const PUBLIC_ID_BYTES = 5;
const PUBLIC_ID_LENGTH = 8;
const BATCH_SIZE = 1000;
// Crockford Base32 — excludes I, L, O, U (see @common CROCKFORD_ALPHABET).
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Mirror of @common encodeCrockford — 5 bytes → 8 chars. */
function encodeCrockford(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += CROCKFORD_ALPHABET[(value >>> bits) & 31];
    }
    value &= (1 << bits) - 1;
  }
  if (bits > 0) output += CROCKFORD_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

/** Mirror of @common slugifyRecordName. */
function slugifyRecordName(value: string, fallback: string): string {
  const base = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  if (!base) return fallback;
  if (/^\d+$/.test(base)) return `${fallback}-${base}`;
  return base;
}

/** Mirror of @common buildPersonSlug — `{name}-{xxxx}-{xxxx}`. */
function buildPersonSlug(firstName: string | null, lastName: string | null, publicId: string): string {
  const source = (firstName ?? '').trim() || (lastName ?? '').trim();
  const name = slugifyRecordName(source, 'person');
  const id = publicId.toLowerCase();
  return `${name}-${id.slice(0, 4)}-${id.slice(4, PUBLIC_ID_LENGTH)}`;
}

function generatePublicId(): string {
  return encodeCrockford(randomBytes(PUBLIC_ID_BYTES));
}

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Pure DDL: add the column and the partial per-tenant unique index.
  await sql`ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS public_id text`.execute(db);
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS persons_tenant_public_id_unique
    ON public.persons USING btree (tenant_id, public_id)
    WHERE (public_id IS NOT NULL)
  `.execute(db);

  // 2. Backfill per tenant so every DB query stays tenant-scoped.
  const tenants = await sql<{ tenant_id: string }>`
    SELECT DISTINCT tenant_id FROM public.persons WHERE public_id IS NULL
  `.execute(db);

  for (const { tenant_id } of tenants.rows) {
    const takenRows = await sql<{ public_id: string }>`
      SELECT public_id FROM public.persons WHERE tenant_id = ${tenant_id} AND public_id IS NOT NULL
    `.execute(db);
    const taken = new Set(takenRows.rows.map((r) => r.public_id));

    for (;;) {
      const batch = await sql<{ id: string; first_name: string | null; last_name: string | null }>`
        SELECT id, first_name, last_name
        FROM public.persons
        WHERE tenant_id = ${tenant_id} AND public_id IS NULL
        ORDER BY id
        LIMIT ${BATCH_SIZE}
      `.execute(db);
      if (batch.rows.length === 0) break;

      for (const row of batch.rows) {
        let publicId = generatePublicId();
        while (taken.has(publicId)) publicId = generatePublicId();
        taken.add(publicId);
        const slug = buildPersonSlug(row.first_name, row.last_name, publicId);
        await sql`
          UPDATE public.persons
          SET public_id = ${publicId}, slug = ${slug}
          WHERE tenant_id = ${tenant_id} AND id = ${row.id}
        `.execute(db);
      }
    }
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  // Leaves the (now display-form) slug values in place — only public_id and its
  // index are this migration's to remove.
  await sql`DROP INDEX IF EXISTS public.persons_tenant_public_id_unique`.execute(db);
  await sql`ALTER TABLE public.persons DROP COLUMN IF EXISTS public_id`.execute(db);
}
