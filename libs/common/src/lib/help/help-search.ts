import { getHelpCategory, HELP_ARTICLES } from './help-content';
import { articleToPlainText } from './help-types';

import type { HelpArticle } from './help-types';

/**
 * Client-side search over the static help content. The corpus is ~30
 * articles, so a straightforward scored scan is instant and dependency-free.
 */

/** A run of text, flagged when it matched a search term (for highlighting). */
export interface HelpHighlightSegment {
  hit: boolean;
  text: string;
}

export interface HelpSearchResult {
  article: HelpArticle;
  score: number;
  /** Summary or body excerpt around the first match, ready to highlight. */
  snippet: HelpHighlightSegment[];
  title: HelpHighlightSegment[];
}

const SCORE_TITLE = 40;
const SCORE_TITLE_WORD_START = 10;
const SCORE_KEYWORD = 25;
const SCORE_SUMMARY = 15;
const SCORE_CATEGORY = 10;
const SCORE_BODY = 8;
const SCORE_PHRASE_IN_TITLE = 30;
const SNIPPET_RADIUS = 90;

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function termsOf(query: string): string[] {
  return normalize(query).split(' ').filter(Boolean);
}

/** Does `haystack` contain `term` starting at a word boundary? */
function hasWordStart(haystack: string, term: string): boolean {
  const at = haystack.indexOf(term);
  if (at === -1) return false;
  if (at === 0) return true;
  return !/[a-z0-9]/.test(haystack.charAt(at - 1));
}

/** Splits `text` into plain/hit segments for every occurrence of any term. */
export function highlightTerms(text: string, terms: string[]): HelpHighlightSegment[] {
  if (terms.length === 0 || text.length === 0) return [{ hit: false, text }];

  const lower = text.toLowerCase();
  const segments: HelpHighlightSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let hitStart = -1;
    let hitLength = 0;
    for (const term of terms) {
      const at = lower.indexOf(term, cursor);
      if (at !== -1 && (hitStart === -1 || at < hitStart || (at === hitStart && term.length > hitLength))) {
        hitStart = at;
        hitLength = term.length;
      }
    }
    if (hitStart === -1) {
      segments.push({ hit: false, text: text.slice(cursor) });
      break;
    }
    if (hitStart > cursor) {
      segments.push({ hit: false, text: text.slice(cursor, hitStart) });
    }
    segments.push({ hit: true, text: text.slice(hitStart, hitStart + hitLength) });
    cursor = hitStart + hitLength;
  }
  return segments;
}

/** A short window of `text` around the first occurrence of any term. */
function excerptAround(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  let first = -1;
  for (const term of terms) {
    const at = lower.indexOf(term);
    if (at !== -1 && (first === -1 || at < first)) first = at;
  }
  if (first === -1) return text.slice(0, SNIPPET_RADIUS * 2);

  let start = Math.max(0, first - SNIPPET_RADIUS);
  let end = Math.min(text.length, first + SNIPPET_RADIUS);
  // Snap to word boundaries so the excerpt doesn't shear words in half.
  if (start > 0) {
    const space = text.indexOf(' ', start);
    if (space !== -1 && space < first) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > first) end = space;
  }
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

/**
 * Ranked search: every term must match somewhere in an article (title,
 * keywords, summary, category label, or body) for it to be a result.
 */
export function searchHelp(query: string, articles: HelpArticle[] = HELP_ARTICLES): HelpSearchResult[] {
  const terms = termsOf(query);
  if (terms.length === 0) return [];
  const phrase = normalize(query);

  const results: HelpSearchResult[] = [];

  for (const article of articles) {
    const title = normalize(article.title);
    const summary = normalize(article.summary);
    const keywords = article.keywords.map(normalize);
    const category = normalize(getHelpCategory(article.category)?.label ?? '');
    const body = normalize(articleToPlainText(article));

    let score = 0;
    let everyTermMatched = true;

    for (const term of terms) {
      let termScore = 0;
      if (title.includes(term)) {
        termScore = SCORE_TITLE + (hasWordStart(title, term) ? SCORE_TITLE_WORD_START : 0);
      } else if (keywords.some((k) => k.includes(term))) {
        termScore = SCORE_KEYWORD;
      } else if (summary.includes(term)) {
        termScore = SCORE_SUMMARY;
      } else if (category.includes(term)) {
        termScore = SCORE_CATEGORY;
      } else if (body.includes(term)) {
        termScore = SCORE_BODY;
      }
      if (termScore === 0) {
        everyTermMatched = false;
        break;
      }
      score += termScore;
    }
    if (!everyTermMatched) continue;
    if (terms.length > 1 && title.includes(phrase)) score += SCORE_PHRASE_IN_TITLE;

    // Prefer the summary; fall back to a body excerpt around the first hit.
    // Keyword/category-only matches keep the summary (no arbitrary body slice).
    const summaryHasTerm = terms.some((t) => summary.includes(t));
    const bodyHasTerm = terms.some((t) => body.includes(t));
    const snippetSource = summaryHasTerm
      ? article.summary
      : bodyHasTerm
        ? excerptAround(articleToPlainText(article), terms)
        : article.summary;

    results.push({
      article,
      score,
      snippet: highlightTerms(snippetSource, terms),
      title: highlightTerms(article.title, terms),
    });
  }

  return results.sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title));
}
