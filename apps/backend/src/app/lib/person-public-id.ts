import { randomBytes } from 'node:crypto';

import type { Kysely } from 'kysely';

import { buildPersonSlug, encodeCrockford } from '@common';
import type { Models } from '../../../../../libs/common/src/lib/kysely.models';

/**
 * Person opaque public_id generation (spec §1). Persons do NOT use a name slug
 * like households/companies — they carry an opaque `public_id` (8 Crockford
 * Base32 chars = 40 CSPRNG bits) that is the canonical lookup key. The pure
 * encode/decode/slug helpers are shared with the frontend in `@common`
 * (libs/common/src/lib/public-id.ts); generation lives here because it needs
 * Node's CSPRNG and the DB. See docs/RECORD-SLUGS.md.
 */

/** 5 bytes = 40 bits = exactly 8 Crockford characters. */
const PUBLIC_ID_BYTES = 5;

/** Partial-unique index enforcing per-tenant public_id uniqueness. */
export const PERSON_PUBLIC_ID_CONSTRAINT = 'persons_tenant_public_id_unique';

/** Interactive-create collision retries before giving up (1-in-2^40 per try). */
export const MAX_PUBLIC_ID_ATTEMPTS = 5;

const BULK_BATCH_SIZE = 1000;

/** A fresh uppercase-canonical public_id from Node's CSPRNG (never Math.random). */
export function generatePersonPublicId(): string {
  return encodeCrockford(randomBytes(PUBLIC_ID_BYTES));
}

/**
 * True when `err` is the Postgres unique-violation (23505) raised by the
 * per-tenant public_id index — the only error the create path retries on.
 */
export function isPersonPublicIdConflict(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const e = err as { code?: unknown; constraint?: unknown };
  return e.code === '23505' && e.constraint === PERSON_PUBLIC_ID_CONSTRAINT;
}

/**
 * Run `attempt` with a freshly generated public_id and its display slug,
 * retrying on a public_id unique-constraint violation up to
 * {@link MAX_PUBLIC_ID_ATTEMPTS} times. This replaces the check-then-insert
 * `uniqueSlug` helper for persons: generate → insert → retry on 23505, so there
 * is no pre-insert lookup race. Any non-collision error propagates immediately.
 */
export async function insertPersonWithPublicId<T>(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  attempt: (publicId: string, slug: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < MAX_PUBLIC_ID_ATTEMPTS; i++) {
    const publicId = generatePersonPublicId();
    const slug = buildPersonSlug(firstName, lastName, publicId);
    try {
      return await attempt(publicId, slug);
    } catch (err) {
      if (!isPersonPublicIdConflict(err)) throw err;
      lastError = err;
    }
  }
  throw lastError ?? new Error('Could not generate a unique person public_id after retries');
}

/**
 * Assign a public_id + display slug to every person in `tenant_id` that lacks
 * one — the set-based companion for bulk insert paths (CSV import), mirroring
 * the migration backfill. Generates ids in JS with an in-memory per-tenant used
 * set (seeded from existing ids) so a batch never collides with itself or with
 * rows already assigned; the partial-unique index is the DB-level backstop.
 * Every query is tenant-scoped. Returns the number of rows updated.
 */
export async function backfillPersonPublicIds(db: Kysely<Models>, tenant_id: string): Promise<number> {
  const taken = new Set<string>();
  const existing = await db
    .selectFrom('persons')
    .select('public_id')
    .where('tenant_id', '=', tenant_id)
    .where('public_id', 'is not', null)
    .execute();
  for (const row of existing) {
    if (row.public_id) taken.add(row.public_id);
  }

  let updated = 0;
  for (;;) {
    const rows = await db
      .selectFrom('persons')
      .select(['id', 'first_name', 'last_name'])
      .where('tenant_id', '=', tenant_id)
      .where('public_id', 'is', null)
      .orderBy('id')
      .limit(BULK_BATCH_SIZE)
      .execute();
    if (rows.length === 0) break;

    for (const row of rows) {
      let publicId = generatePersonPublicId();
      while (taken.has(publicId)) publicId = generatePersonPublicId();
      taken.add(publicId);
      const slug = buildPersonSlug(row.first_name, row.last_name, publicId);
      await db
        .updateTable('persons')
        .set({ public_id: publicId, slug })
        .where('tenant_id', '=', tenant_id)
        .where('id', '=', row.id)
        .execute();
      updated += 1;
    }
  }
  return updated;
}
