import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Schema review 2026-07-06 §3 — newsletters.target_lists and
 * web_forms.target_lists stored arrays of list ids as JSONB documents with no
 * referential integrity: deleting a list left dangling ids behind, which the
 * code paths then had to skip silently (a published form claiming "adds
 * signups to List X" would quietly do nothing forever), and answering "which
 * newsletters targeted this list" meant fetching every sent newsletter and
 * filtering in JS.
 *
 * This normalizes both into join tables following the existing map_* idiom:
 *
 *   - map_newsletters_lists (mode 'include' | 'exclude' — newsletters target
 *     an {include, exclude} pair of list sets)
 *   - map_web_forms_lists
 *
 * Unlike the older map_* tables, list_id and the parent id here carry
 * ON DELETE CASCADE — nothing in app code cleans these up when a list or
 * parent dies, the FK itself is the referential-integrity backstop this
 * migration exists to add.
 *
 * The backfill parses every legacy shape the readers tolerated ({include,
 * exclude} object, bare array, JSON-string, CSV-string), drops ids that don't
 * resolve to a live list in the same tenant (they are behavioral no-ops
 * today), and leaves the JSONB columns in place — writers dual-write during
 * the transition and a later migration drops the columns once verified.
 *
 * Tag targeting (web_forms.target_tags, newsletters.segments) intentionally
 * stays JSONB: those hold tag *names* with get-or-create semantics, not ids —
 * there is no reference to protect.
 *
 * Both tables get the S-1 FORCE-RLS tenant_isolation policy (the S-1 loop
 * only covered tables that existed when it ran).
 */

const TENANT_POLICY_EXPR = `NULLIF(current_setting('app.tenant_id', true), '') IS NULL
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint`;

interface TargetListSets {
  include: string[];
  exclude: string[];
}

/** Mirrors the three-way tolerant parse the newsletter/web-form readers used. */
function parseTargetLists(value: unknown): TargetListSets {
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    const raw = parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // legacy CSV string
      return { include: raw.split(',').map((s) => s.trim()), exclude: [] };
    }
  }
  if (Array.isArray(parsed)) {
    return { include: parsed.map((v) => String(v)), exclude: [] };
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const toIds = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
    return { include: toIds(obj['include']), exclude: toIds(obj['exclude']) };
  }
  return { include: [], exclude: [] };
}

/** Keep only well-formed bigint ids that resolve to a live list in the tenant. */
function validListIds(ids: string[], tenantId: string, liveLists: Set<string>): string[] {
  return [...new Set(ids)].filter((id) => /^\d+$/.test(id) && liveLists.has(`${tenantId}|${id}`));
}

const INSERT_CHUNK = 500;

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE public.map_newsletters_lists (
      tenant_id     bigint NOT NULL,
      newsletter_id bigint NOT NULL,
      list_id       bigint NOT NULL,
      mode          text   NOT NULL DEFAULT 'include',
      createdby_id  bigint NOT NULL,
      updatedby_id  bigint NOT NULL,
      created_at    timestamp with time zone DEFAULT now() NOT NULL,
      updated_at    timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT map_newsletters_lists_pk PRIMARY KEY (tenant_id, newsletter_id, list_id, mode),
      CONSTRAINT chk_map_newsletters_lists_mode CHECK (mode IN ('include', 'exclude')),
      CONSTRAINT fk_map_newsletters_lists_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
      CONSTRAINT fk_map_newsletters_lists_newsletter FOREIGN KEY (newsletter_id)
        REFERENCES public.newsletters(id) ON DELETE CASCADE,
      CONSTRAINT fk_map_newsletters_lists_list FOREIGN KEY (list_id)
        REFERENCES public.lists(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_map_newsletters_lists_list ON public.map_newsletters_lists (tenant_id, list_id);

    CREATE TABLE public.map_web_forms_lists (
      tenant_id    bigint NOT NULL,
      web_form_id  uuid   NOT NULL,
      list_id      bigint NOT NULL,
      createdby_id bigint NOT NULL,
      updatedby_id bigint NOT NULL,
      created_at   timestamp with time zone DEFAULT now() NOT NULL,
      updated_at   timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT map_web_forms_lists_pk PRIMARY KEY (tenant_id, web_form_id, list_id),
      CONSTRAINT fk_map_web_forms_lists_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
      CONSTRAINT fk_map_web_forms_lists_form FOREIGN KEY (web_form_id)
        REFERENCES public.web_forms(id) ON DELETE CASCADE,
      CONSTRAINT fk_map_web_forms_lists_list FOREIGN KEY (list_id)
        REFERENCES public.lists(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_map_web_forms_lists_list ON public.map_web_forms_lists (tenant_id, list_id);
  `.execute(db);

  for (const table of ['map_newsletters_lists', 'map_web_forms_lists']) {
    await sql`
      ALTER TABLE public.${sql.raw(table)} ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.${sql.raw(table)} FORCE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON public.${sql.raw(table)}
        FOR ALL
        USING (${sql.raw(TENANT_POLICY_EXPR)})
        WITH CHECK (${sql.raw(TENANT_POLICY_EXPR)});
    `.execute(db);
  }

  // ---- Backfill ----
  const lists = await db.selectFrom('lists').select(['id', 'tenant_id']).execute();
  const liveLists = new Set<string>(lists.map((l: any) => `${l.tenant_id}|${l.id}`));

  const newsletters = await db
    .selectFrom('newsletters')
    .select(['id', 'tenant_id', 'createdby_id', 'target_lists'])
    .where('target_lists', 'is not', null)
    .execute();

  const newsletterRows: Record<string, unknown>[] = [];
  for (const n of newsletters as any[]) {
    const tenantId = String(n.tenant_id);
    const { include, exclude } = parseTargetLists(n.target_lists);
    for (const [mode, ids] of [
      ['include', include],
      ['exclude', exclude],
    ] as const) {
      for (const listId of validListIds(ids, tenantId, liveLists)) {
        newsletterRows.push({
          tenant_id: n.tenant_id,
          newsletter_id: n.id,
          list_id: listId,
          mode,
          createdby_id: n.createdby_id,
          updatedby_id: n.createdby_id,
        });
      }
    }
  }
  for (let i = 0; i < newsletterRows.length; i += INSERT_CHUNK) {
    await db
      .insertInto('map_newsletters_lists')
      .values(newsletterRows.slice(i, i + INSERT_CHUNK))
      .execute();
  }

  const webForms = await db
    .selectFrom('web_forms')
    .select(['id', 'tenant_id', 'createdby_id', 'target_lists'])
    .where('target_lists', 'is not', null)
    .execute();

  const webFormRows: Record<string, unknown>[] = [];
  for (const f of webForms as any[]) {
    const tenantId = String(f.tenant_id);
    const { include } = parseTargetLists(f.target_lists);
    for (const listId of validListIds(include, tenantId, liveLists)) {
      webFormRows.push({
        tenant_id: f.tenant_id,
        web_form_id: f.id,
        list_id: listId,
        createdby_id: f.createdby_id,
        updatedby_id: f.createdby_id,
      });
    }
  }
  for (let i = 0; i < webFormRows.length; i += INSERT_CHUNK) {
    await db
      .insertInto('map_web_forms_lists')
      .values(webFormRows.slice(i, i + INSERT_CHUNK))
      .execute();
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  // The JSONB columns were never dropped, so no reverse backfill is needed.
  await sql`
    DROP TABLE IF EXISTS public.map_newsletters_lists;
    DROP TABLE IF EXISTS public.map_web_forms_lists;
  `.execute(db);
}
