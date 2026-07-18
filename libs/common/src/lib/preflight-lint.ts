import type { AiPreflightVerdict, PreflightFinding, PreflightSeverity } from './schemas/content-check.schema';

/**
 * Deterministic newsletter lint + scoring. Pure and isomorphic (no Node/browser-only APIs) so the
 * composer runs it live while the backend runs the identical checks authoritatively at send time.
 * Every check yields a PreflightFinding whose deduction is subtracted from a 100-point score; the
 * builders at the bottom convert the SpamAssassin score and the AI verdict into the same finding
 * shape so the UI renders one list and the score stays a single explainable mechanism.
 */

export interface PreflightInput {
  subject: string;
  html: string;
  plainText?: string;
}

// Point deductions per finding. Sized so any single "block"-severity pattern (phishing-shaped
// links, base64 payloads) pulls the score below PREFLIGHT_BLOCK on its own or nearly so, while
// style nits stay advisory. Tuning one of these is deliberately a one-line change.
const DEDUCT = {
  subjectEmpty: 30,
  subjectTooLong: 5,
  subjectCaps: 10,
  subjectExclamations: 8,
  subjectMoneySymbols: 8,
  subjectFakeReply: 15,
  htmlOversize: 15,
  imageOnlyBody: 15,
  imagesMissingAlt: 3,
  insecureUrls: 5,
  base64Image: 25,
  tooManyLinks: 8,
  urlShortener: 12,
  anchorDomainMismatch: 30,
  rawIpLink: 25,
  suspiciousProtocol: 25,
  aiDeceptionFlags: 10,
  aiDisallowedContent: 90,
} as const;

const SUBJECT_MAX_CHARS = 70;
const SUBJECT_CAPS_RATIO = 0.3;
const SUBJECT_MIN_LETTERS_FOR_CAPS = 8;
// Gmail clips messages around 102KB of HTML; warn with margin before that.
const HTML_SIZE_WARN_BYTES = 100_000;
const IMAGE_ONLY_MIN_TEXT_CHARS = 200;
const MAX_LINKS = 25;
// SpamAssassin's conventional spam threshold is 5; we start surfacing at 3.
const SPAMASSASSIN_INFO_AT = 3;
const SPAMASSASSIN_WARN_AT = 5;
const SPAMASSASSIN_DEDUCTION_PER_POINT = 2;
const SPAMASSASSIN_MAX_DEDUCTION = 30;
// The AI risk score contributes at most this many points, scaled by its confidence.
const AI_RISK_MAX_DEDUCTION = 40;
const AI_RISK_WARN_AT = 60;
// Below this confidence a disallowed-content verdict is advisory, not score-capping.
const AI_DISALLOWED_MIN_CONFIDENCE = 0.6;

// Widely-abused URL shorteners. Curated and small on purpose — extend it, don't import a huge list.
const URL_SHORTENER_HOSTS = new Set([
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  't.co',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'rebrand.ly',
  'cutt.ly',
  'shorturl.at',
  'rb.gy',
  'tiny.cc',
  'lnkd.in',
  's.id',
  'snip.ly',
]);

/**
 * Canonical string the content hash is computed over (raw stored fields, never rendered output),
 * so the composer's pre-save check and the send-time row-loaded check hash identically. The server
 * hashes this with sha256; hashing itself is not isomorphic so it stays out of this module.
 */
export function preflightHashInput(subject: string, html: string, plainText: string | null | undefined): string {
  return `${subject}\u0000${html}\u0000${plainText ?? ''}`;
}

function finding(
  code: string,
  severity: PreflightSeverity,
  deduction: number,
  message: string,
  hint: string,
): PreflightFinding {
  return { code, severity, message, hint, deduction };
}

/** Strips tags/styles and decodes the common entities — just enough text to measure, not render. */
function visibleTextOf(html: string): string {
  return html
    .replace(/<(style|script|head|title)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/** True when the two hosts are the same registrable site (one is the other or a subdomain). */
function sameSite(a: string, b: string): boolean {
  const ha = a.toLowerCase().replace(/^www\./, '');
  const hb = b.toLowerCase().replace(/^www\./, '');
  return ha === hb || ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`);
}

interface AnchorRef {
  href: string;
  text: string;
}

function extractAnchors(html: string): AnchorRef[] {
  const anchors: AnchorRef[] = [];
  const re = /<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    anchors.push({ href: (m[2] ?? '').trim(), text: (m[3] ?? '').replace(/<[^>]+>/g, ' ').trim() });
  }
  return anchors;
}

interface ImgRef {
  src: string;
  hasAlt: boolean;
}

function extractImages(html: string): ImgRef[] {
  const imgs: ImgRef[] = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = /\bsrc\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2] ?? '';
    const alt = /\balt\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2] ?? '';
    imgs.push({ src: src.trim(), hasAlt: alt.trim().length > 0 });
  }
  return imgs;
}

function lintSubject(subject: string, out: PreflightFinding[]): void {
  const trimmed = subject.trim();
  if (!trimmed) {
    out.push(
      finding(
        'subject-empty',
        'block',
        DEDUCT.subjectEmpty,
        'The subject line is empty.',
        'Write a short, specific subject — it is the single biggest factor in whether people open the email.',
      ),
    );
    return;
  }
  if (trimmed.length > SUBJECT_MAX_CHARS) {
    out.push(
      finding(
        'subject-too-long',
        'info',
        DEDUCT.subjectTooLong,
        `The subject is ${trimmed.length} characters — inboxes truncate around ${SUBJECT_MAX_CHARS}.`,
        'Front-load the message so the part people see carries the meaning.',
      ),
    );
  }
  const letters = trimmed.replace(/[^a-z]/gi, '');
  const upper = trimmed.replace(/[^A-Z]/g, '');
  if (letters.length >= SUBJECT_MIN_LETTERS_FOR_CAPS && upper.length / letters.length > SUBJECT_CAPS_RATIO) {
    out.push(
      finding(
        'subject-caps',
        'warn',
        DEDUCT.subjectCaps,
        'The subject shouts — a large share of it is in capitals.',
        'Use sentence case. ALL-CAPS subjects correlate strongly with spam complaints.',
      ),
    );
  }
  if (/!{2,}/.test(trimmed) || (trimmed.match(/!/g) ?? []).length > 2) {
    out.push(
      finding(
        'subject-exclamations',
        'warn',
        DEDUCT.subjectExclamations,
        'The subject leans on exclamation marks.',
        'One is plenty — stacked "!!" reads as spam to filters and to people.',
      ),
    );
  }
  if (/[$€£]{2,}/.test(trimmed) || (trimmed.match(/[$€£]/g) ?? []).length >= 3) {
    out.push(
      finding(
        'subject-money-symbols',
        'warn',
        DEDUCT.subjectMoneySymbols,
        'The subject repeats currency symbols.',
        'Spell amounts out ("Help us raise $5,000") instead of stacking symbols.',
      ),
    );
  }
  if (/^(re|fwd?)\s*:/i.test(trimmed)) {
    out.push(
      finding(
        'subject-fake-reply',
        'warn',
        DEDUCT.subjectFakeReply,
        'The subject starts with "Re:" or "Fwd:" on a broadcast.',
        'Faking a reply thread is deceptive (and a CAN-SPAM problem) — drop the prefix.',
      ),
    );
  }
}

function lintBody(html: string, out: PreflightFinding[]): void {
  const bytes = new TextEncoder().encode(html).length;
  if (bytes >= HTML_SIZE_WARN_BYTES) {
    out.push(
      finding(
        'html-oversize',
        'warn',
        DEDUCT.htmlOversize,
        `The email HTML is ${Math.round(bytes / 1024)}KB — Gmail clips messages near 102KB.`,
        'A clipped message hides your unsubscribe link and footer. Trim content or split into two sends.',
      ),
    );
  }

  const text = visibleTextOf(html);
  const images = extractImages(html);

  if (images.length > 0 && text.length < IMAGE_ONLY_MIN_TEXT_CHARS) {
    out.push(
      finding(
        'image-only-body',
        'warn',
        DEDUCT.imageOnlyBody,
        'The email is nearly all image with very little text.',
        'Filters distrust image-only mail, and image-blocking clients show nothing. Add real text.',
      ),
    );
  }

  const missingAlt = images.filter((i) => !i.hasAlt && !i.src.startsWith('data:')).length;
  if (missingAlt > 0) {
    out.push(
      finding(
        'images-missing-alt',
        'info',
        DEDUCT.imagesMissingAlt,
        `${missingAlt} image${missingAlt === 1 ? '' : 's'} ha${missingAlt === 1 ? 's' : 've'} no alt text.`,
        'Alt text is what people see while images load (or stay blocked) — describe each image briefly.',
      ),
    );
  }

  const base64Count = images.filter((i) => i.src.startsWith('data:')).length;
  if (base64Count > 0) {
    out.push(
      finding(
        'base64-image',
        'block',
        DEDUCT.base64Image,
        `${base64Count} image${base64Count === 1 ? ' is' : 's are'} embedded as base64 data.`,
        'Embedded images balloon the HTML past clipping limits and are a spam signal — host images on an https URL instead.',
      ),
    );
  }

  const anchors = extractAnchors(html);
  const httpAnchors = anchors
    .map((a) => ({ ...a, url: parseUrl(a.href) }))
    .filter((a): a is AnchorRef & { url: URL } => a.url != null);

  if (anchors.length > MAX_LINKS) {
    out.push(
      finding(
        'too-many-links',
        'warn',
        DEDUCT.tooManyLinks,
        `The email contains ${anchors.length} links.`,
        `Heavily link-stuffed mail scores worse. Keep it under ${MAX_LINKS} and make each link count.`,
      ),
    );
  }

  const shorteners = httpAnchors.filter((a) => URL_SHORTENER_HOSTS.has(a.url.hostname.replace(/^www\./, '')));
  if (shorteners.length > 0) {
    out.push(
      finding(
        'url-shortener',
        'warn',
        DEDUCT.urlShortener,
        `Links use URL shorteners (${[...new Set(shorteners.map((s) => s.url.hostname))].join(', ')}).`,
        'Shortener domains are heavily abused by spammers — link the real destination instead.',
      ),
    );
  }

  const insecure = [
    ...httpAnchors.filter((a) => a.url.protocol === 'http:'),
    ...images.filter((i) => i.src.toLowerCase().startsWith('http://')),
  ].length;
  if (insecure > 0) {
    out.push(
      finding(
        'insecure-urls',
        'warn',
        DEDUCT.insecureUrls,
        `${insecure} link${insecure === 1 ? '' : 's'}/image${insecure === 1 ? '' : 's'} use plain http://.`,
        'Serve every link and image over https — mixed content looks unsafe to filters and clients.',
      ),
    );
  }

  const rawIp = httpAnchors.filter((a) => /^\d{1,3}(\.\d{1,3}){3}$/.test(a.url.hostname));
  if (rawIp.length > 0) {
    out.push(
      finding(
        'raw-ip-link',
        'block',
        DEDUCT.rawIpLink,
        'A link points at a bare IP address.',
        'Legitimate mail links to domains, not IPs — this is a classic phishing pattern.',
      ),
    );
  }

  const suspicious = anchors.filter((a) => /^(javascript|data|vbscript):/i.test(a.href));
  if (suspicious.length > 0) {
    out.push(
      finding(
        'suspicious-protocol',
        'block',
        DEDUCT.suspiciousProtocol,
        'A link uses a script/data protocol.',
        'Email clients strip these and filters flag them — use https links only.',
      ),
    );
  }

  // Anchor text that names one site while the href goes to another is the signature phishing shape.
  const DOMAIN_IN_TEXT_RE = /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i;
  const mismatched = httpAnchors.filter((a) => {
    const m = DOMAIN_IN_TEXT_RE.exec(a.text);
    if (!m?.[1]) return false;
    const claimed = m[1];
    // Only treat it as a domain claim when it has a plausible TLD (avoids "e.g" style false hits).
    if (!/\.[a-z]{2,}$/i.test(claimed)) return false;
    return !sameSite(claimed, a.url.hostname);
  });
  if (mismatched.length > 0) {
    out.push(
      finding(
        'anchor-domain-mismatch',
        'block',
        DEDUCT.anchorDomainMismatch,
        `Link text claims one site but points to another (e.g. "${mismatched[0]?.text.slice(0, 60)}").`,
        'Make the visible text match the real destination — mismatches are the signature phishing pattern.',
      ),
    );
  }
}

/** Runs every deterministic check. Pure — same result in the composer and on the server. */
export function lintNewsletterContent(input: PreflightInput): PreflightFinding[] {
  const out: PreflightFinding[] = [];
  lintSubject(input.subject, out);
  lintBody(input.html, out);
  return out;
}

/** Converts a SpamAssassin score (Postmark spamcheck) into a finding, or null when unremarkable. */
export function buildSpamAssassinFinding(saScore: number): PreflightFinding | null {
  if (saScore < SPAMASSASSIN_INFO_AT) return null;
  const deduction = Math.min(
    SPAMASSASSIN_MAX_DEDUCTION,
    Math.max(0, Math.round(SPAMASSASSIN_DEDUCTION_PER_POINT * (saScore - SPAMASSASSIN_INFO_AT))),
  );
  return finding(
    'spamassassin-score',
    saScore >= SPAMASSASSIN_WARN_AT ? 'warn' : 'info',
    deduction,
    `SpamAssassin scores this email ${saScore.toFixed(1)} (5+ is typically filtered).`,
    'Review the flagged wording and structure — small copy changes usually drop this fast.',
  );
}

/** Converts the AI verdict into findings (risk contribution, deception flags, disallowed content). */
export function buildAiFindings(verdict: AiPreflightVerdict): PreflightFinding[] {
  const out: PreflightFinding[] = [];

  const disallowed = verdict.contentType === 'pure_commercial_marketing' || verdict.contentType === 'scam_or_phishing';
  if (disallowed && verdict.confidence >= AI_DISALLOWED_MIN_CONFIDENCE) {
    const isScam = verdict.contentType === 'scam_or_phishing';
    out.push(
      finding(
        isScam ? 'ai-scam-phishing' : 'ai-commercial-marketing',
        'block',
        DEDUCT.aiDisallowedContent,
        isScam
          ? 'The content review flagged this as a possible scam or phishing message.'
          : 'The content review reads this as commercial marketing, which pplCRM newsletters do not cover.',
        isScam
          ? 'If this is a mistake, adjust the wording that resembles credential or payment bait and re-run the check.'
          : 'pplCRM sending is for community, political and nonprofit updates — including fundraising and auctions. Product-sales blasts are outside the acceptable-use policy.',
      ),
    );
  }

  const riskDeduction = Math.round((verdict.spamRiskScore / 100) * AI_RISK_MAX_DEDUCTION * verdict.confidence);
  if (riskDeduction > 0) {
    const reasons = verdict.reasons.slice(0, 3).join('; ');
    out.push(
      finding(
        'ai-spam-risk',
        verdict.spamRiskScore >= AI_RISK_WARN_AT ? 'warn' : 'info',
        riskDeduction,
        `The content review rates the copy ${verdict.spamRiskScore}/100 for spam-like patterns${reasons ? ` — ${reasons}` : ''}.`,
        'See the suggestions below for the specific lines to soften.',
      ),
    );
  }

  if (verdict.deceptionFlags.length > 0) {
    out.push(
      finding(
        'ai-deception-flags',
        'warn',
        DEDUCT.aiDeceptionFlags,
        `The copy uses pressure patterns: ${verdict.deceptionFlags.slice(0, 4).join(', ')}.`,
        'Manufactured urgency and misleading claims drive spam reports — state the real ask plainly.',
      ),
    );
  }

  return out;
}

/** 100 minus every deduction, clamped to 0–100 and rounded. */
export function computeScore(findings: PreflightFinding[]): number {
  const total = findings.reduce((sum, f) => sum + f.deduction, 0);
  return Math.max(0, Math.min(100, Math.round(100 - total)));
}
