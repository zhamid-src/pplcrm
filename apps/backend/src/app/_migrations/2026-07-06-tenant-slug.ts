import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Adds a globally-unique, DNS-safe `slug` to tenants — the subdomain label that identifies a tenant
 * on a shared domain (`<slug>.<baseDomain>`), so the public form page can resolve the tenant from the
 * Host header instead of guessing from a per-tenant form slug.
 *
 * Backfill: slugify the tenant name; fall back to `t-<id>` when the name yields nothing usable or
 * collides with a reserved label; de-duplicate collisions with a numeric suffix by id order.
 */
const RESERVED = [
  'app',
  'www',
  'api',
  'admin',
  'mail',
  'email',
  'ftp',
  'smtp',
  'imap',
  'pop',
  'ns',
  'ns1',
  'ns2',
  'dns',
  'mx',
  'static',
  'assets',
  'cdn',
  'media',
  'files',
  'download',
  'downloads',
  'status',
  'help',
  'support',
  'docs',
  'blog',
  'dev',
  'staging',
  'stage',
  'test',
  'demo',
  'sandbox',
  'portal',
  'dashboard',
  'account',
  'accounts',
  'billing',
  'pay',
  'payments',
  'auth',
  'login',
  'logout',
  'signup',
  'signin',
  'register',
  'public',
  'forms',
  'f',
  'localhost',
  'root',
  'system',
];

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug text`.execute(db);

  await sql`
    WITH slugged AS (
      SELECT
        id,
        CASE
          WHEN base = '' OR base = ANY(${sql.val(RESERVED)}::text[]) THEN 't-' || id::text
          ELSE base
        END AS candidate
      FROM (
        SELECT
          id,
          regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g') AS base
        FROM public.tenants
        WHERE slug IS NULL
      ) s
    ),
    numbered AS (
      SELECT id, candidate,
        row_number() OVER (PARTITION BY candidate ORDER BY id) AS rn
      FROM slugged
    )
    UPDATE public.tenants t
    SET slug = CASE WHEN n.rn = 1 THEN n.candidate ELSE n.candidate || '-' || n.rn END
    FROM numbered n
    WHERE t.id = n.id
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (slug) WHERE slug IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS public.idx_tenants_slug`.execute(db);
  await sql`ALTER TABLE public.tenants DROP COLUMN IF EXISTS slug`.execute(db);
}
