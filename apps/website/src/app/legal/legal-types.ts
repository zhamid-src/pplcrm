/**
 * Content model for the site's legal and policy documents (privacy, EULA,
 * security). Same philosophy as the help center: plain typed data, no HTML,
 * so the pages are type-checked and immune to XSS by design.
 *
 * Inline text supports the shared help mini-markup (`**bold**` and
 * `[label](/route)`), rendered by `pc-legal-rich-text`; links stay on the
 * marketing site.
 */
export type LegalBlock =
  | { kind: 'h2'; id: string; text: string }
  | { kind: 'list'; items: readonly string[]; ordered?: boolean }
  | { kind: 'p'; text: string };

export interface LegalDoc {
  readonly blocks: readonly LegalBlock[];
  /** Kicker above the title (e.g. "Legal"). */
  readonly eyebrow: string;
  /** One-sentence plain-language summary shown under the title. */
  readonly intro: string;
  readonly title: string;
  /** Human-readable revision date (e.g. "July 16, 2026"). */
  readonly updated: string;
}
