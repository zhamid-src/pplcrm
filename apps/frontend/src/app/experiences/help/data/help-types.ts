import type { PcIconNameType } from '@icons/icons.index';

/**
 * Content model for the in-app help center.
 *
 * Articles are plain data (no HTML) rendered through typed blocks, so the
 * help content is searchable, type-checked, and immune to XSS by design.
 */

export type HelpCategoryId =
  | 'getting-started'
  | 'contacts'
  | 'grids'
  | 'segmentation'
  | 'outreach'
  | 'engagement'
  | 'productivity'
  | 'data'
  | 'admin';

export interface HelpCategory {
  /** One-sentence description shown on the category card. */
  blurb: string;
  icon: PcIconNameType;
  id: HelpCategoryId;
  label: string;
}

export interface HelpStep {
  detail?: string;
  title: string;
}

export interface HelpKeyRow {
  action: string;
  keys: string[];
}

/**
 * A single content block. Inline text in `text`, `items`, and step fields
 * supports the mini-markup parsed by `parseHelpInline`:
 * `**bold**`, `` `code` `` and `[label](/internal/route)`.
 */
export type HelpBlock =
  | { kind: 'callout'; tone: 'info' | 'tip' | 'warning'; title: string; text: string }
  | { kind: 'h2'; id: string; text: string }
  | { kind: 'keys'; rows: HelpKeyRow[] }
  | { kind: 'list'; items: string[]; ordered?: boolean }
  | { kind: 'p'; text: string }
  | { kind: 'steps'; items: HelpStep[] };

export interface HelpArticle {
  blocks: HelpBlock[];
  category: HelpCategoryId;
  /** Stable slug used in the /help/:id route. */
  id: string;
  /** Extra search terms that don't appear verbatim in the copy. */
  keywords: string[];
  /** Ids of hand-picked related articles. */
  related?: string[];
  summary: string;
  title: string;
}

export interface HelpInlineSegment {
  kind: 'bold' | 'code' | 'link' | 'text';
  /** Internal route, present only when kind === 'link'. */
  route?: string;
  text: string;
}

const INLINE_TOKEN = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parses the help mini-markup into typed segments. Unknown or unterminated
 * markers are left as plain text; only internal routes (starting with `/`)
 * become links, anything else stays literal text.
 */
export function parseHelpInline(text: string): HelpInlineSegment[] {
  const segments: HelpInlineSegment[] = [];
  let cursor = 0;

  INLINE_TOKEN.lastIndex = 0;
  for (let match = INLINE_TOKEN.exec(text); match !== null; match = INLINE_TOKEN.exec(text)) {
    if (match.index > cursor) {
      segments.push({ kind: 'text', text: text.slice(cursor, match.index) });
    }

    const [, bold, code, linkLabel, linkTarget] = match;
    if (bold !== undefined) {
      segments.push({ kind: 'bold', text: bold });
    } else if (code !== undefined) {
      segments.push({ kind: 'code', text: code });
    } else if (linkLabel !== undefined && linkTarget !== undefined && linkTarget.startsWith('/')) {
      segments.push({ kind: 'link', route: linkTarget, text: linkLabel });
    } else {
      // Non-internal link targets are rendered as-is so nothing silently 404s.
      segments.push({ kind: 'text', text: match[0] });
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', text: text.slice(cursor) });
  }
  return segments;
}

/** Plain text of one inline-markup string (markers stripped) for search. */
export function stripHelpInline(text: string): string {
  return parseHelpInline(text)
    .map((s) => s.text)
    .join('');
}

/** All searchable plain text of a block, headings included. */
export function blockToPlainText(block: HelpBlock): string {
  switch (block.kind) {
    case 'p':
    case 'h2':
      return stripHelpInline(block.text);
    case 'list':
      return block.items.map(stripHelpInline).join(' ');
    case 'steps':
      return block.items.map((s) => [s.title, s.detail ?? ''].map(stripHelpInline).join(' ')).join(' ');
    case 'callout':
      return `${stripHelpInline(block.title)} ${stripHelpInline(block.text)}`;
    case 'keys':
      return block.rows.map((r) => `${r.keys.join(' ')} ${stripHelpInline(r.action)}`).join(' ');
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

/** Whole-article plain text used for search indexing. */
export function articleToPlainText(article: HelpArticle): string {
  return article.blocks.map(blockToPlainText).join(' ');
}

const WORDS_PER_MINUTE = 200;

/** Estimated reading time in whole minutes (always at least 1). */
export function readingMinutes(article: HelpArticle): number {
  const words = `${article.title} ${article.summary} ${articleToPlainText(article)}`
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
