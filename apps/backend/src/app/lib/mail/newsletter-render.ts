/**
 * Pure, I/O-free render transforms applied to newsletter content at send time. Kept side-effect free
 * so they can be unit-tested in isolation (see newsletter-render.spec.ts). The send handler
 * (`lib/jobs/handlers/newsletter.handlers.ts`) and the test-email path
 * (`modules/newsletters/controller.ts`) both compose these before handing HTML to SendGrid.
 */

// The visual editor embeds its block model as a JSON comment. It must never ship in a sent email.
const BLOCK_DATA_COMMENT_RE = /<!--\s*PPLCRM_VISUAL_BLOCKS_DATA:[\s\S]*?-->/g;

// The editor's merge-field syntax: {FieldName} or {FieldName|fallback text}. Mirrors the pattern in
// the frontend visual-newsletter-editor so send-time substitution matches the editor's preview.
const MERGE_TOKEN_PATTERN = '\\{([a-zA-Z0-9_]+)(?:\\|([^}]*))?\\}';

// Marker attribute so preheader injection is idempotent across composed calls.
const PREHEADER_MARKER = 'data-pc-preheader';

export interface MergeToken {
  /** The literal token as it appears in the content, e.g. "{FirstName|there}". */
  token: string;
  /** The field name, e.g. "FirstName". */
  field: string;
  /** The fallback text after "|", or "" when none was given. */
  fallback: string;
}

export interface MergeRecipient {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

/** Escapes the characters that would break out of an HTML text/attribute context. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** True for absolute URLs (with a scheme) and protocol-relative (`//host`) URLs. */
function isAbsoluteUrl(url: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
}

/** Removes the editor's block-model JSON comment(s) so they never ship in the sent email. */
export function stripEditorBlockData(html: string): string {
  return html.replace(BLOCK_DATA_COMMENT_RE, '');
}

/**
 * Rewrites relative `<img src>` values (e.g. "assets/newsletters/x.png") to absolute URLs against
 * baseUrl so they resolve in email clients, which have no notion of the app's origin. Absolute,
 * protocol-relative, `data:` and `cid:` URLs are left untouched.
 */
export function rewriteRelativeImageUrls(html: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return html.replace(
    /(<img\b[^>]*?\bsrc\s*=\s*)(["'])(.*?)\2/gi,
    (match, prefix: string, quote: string, url: string) => {
      const trimmed = url.trim();
      if (!trimmed || isAbsoluteUrl(trimmed)) return match;
      const path = trimmed.replace(/^\.?\/+/, '');
      return `${prefix}${quote}${base}/${path}${quote}`;
    },
  );
}

/**
 * Injects previewText as a hidden preheader block at the top of the body. Idempotent — if a
 * preheader has already been injected (marker present) or previewText is empty, returns html
 * unchanged. The preheader is what inboxes show next to the subject line.
 */
export function injectPreheader(html: string, previewText: string | null | undefined): string {
  const text = (previewText ?? '').trim();
  if (!text || html.includes(PREHEADER_MARKER)) return html;
  const preheader =
    `<div ${PREHEADER_MARKER} style="display:none;max-height:0;overflow:hidden;` +
    `mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">` +
    `${escapeHtml(text)}</div>`;
  const bodyMatch = html.match(/<body\b[^>]*>/i);
  if (bodyMatch) {
    const idx = html.indexOf(bodyMatch[0]) + bodyMatch[0].length;
    return html.slice(0, idx) + preheader + html.slice(idx);
  }
  return preheader + html;
}

/** Composes the send-time HTML transforms: strip block data, rewrite images, inject preheader. */
export function renderNewsletterHtml(html: string, options: { baseUrl: string; previewText?: string | null }): string {
  let out = stripEditorBlockData(html);
  out = rewriteRelativeImageUrls(out, options.baseUrl);
  out = injectPreheader(out, options.previewText);
  return out;
}

/** Scans the given content strings for the distinct merge tokens they contain. */
export function extractMergeTokens(...contents: (string | null | undefined)[]): MergeToken[] {
  const re = new RegExp(MERGE_TOKEN_PATTERN, 'g');
  const byToken = new Map<string, MergeToken>();
  for (const content of contents) {
    if (!content) continue;
    for (const m of content.matchAll(re)) {
      const token = m[0];
      if (byToken.has(token)) continue;
      byToken.set(token, { token, field: m[1] ?? '', fallback: m[2] ?? '' });
    }
  }
  return [...byToken.values()];
}

/** Resolves a single merge field for a recipient. Returns null when the field is unknown or empty. */
function rawFieldValue(field: string, recipient: MergeRecipient): string | null {
  switch (field.toLowerCase()) {
    case 'firstname':
      return recipient.firstName ?? null;
    case 'lastname':
      return recipient.lastName ?? null;
    case 'name':
      return [recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || null;
    case 'email':
      return recipient.email ?? null;
    case 'phone':
      return recipient.phone ?? null;
    default:
      return null; // unknown field — resolved via fallback below
  }
}

/**
 * Builds the SendGrid substitution map for one recipient: token -> resolved, HTML-escaped value.
 * A field with no value uses the token's "|fallback" text (or "" when none). Unknown fields also
 * fall back, so no raw "{Field}" ever ships to a recipient.
 */
export function resolveMergeSubstitutions(tokens: MergeToken[], recipient: MergeRecipient): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tokens) {
    const value = rawFieldValue(t.field, recipient);
    const resolved = value != null && value !== '' ? value : t.fallback;
    out[t.token] = escapeHtml(resolved);
  }
  return out;
}
