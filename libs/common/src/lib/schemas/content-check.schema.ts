import { z } from 'zod';

/**
 * Newsletter preflight ("deliverability check") shared contracts.
 *
 * One number drives the whole feature: a 0–100 deliverability score (higher is better) assembled
 * from explainable per-finding deductions. The band thresholds live here — not in backend
 * send-guards — because the composer gauge and the server-side send gate must agree on where the
 * bands sit. The score is a best-practices measure, not a literal spam probability: inbox placement
 * is mostly sender reputation + engagement, which no pre-send check can compute.
 */

/** Scores at or above this are "good — ready to send". */
export const PREFLIGHT_GOOD = 80;
/** Scores below this block sending (all plans). Between the two bounds: "fix before sending". */
export const PREFLIGHT_BLOCK = 50;

export const PREFLIGHT_BANDS = ['good', 'fix', 'blocked'] as const;
export type PreflightBand = (typeof PREFLIGHT_BANDS)[number];

/** Maps a score to its band. Single source of truth for the gauge and the send gate. */
export function preflightBand(score: number): PreflightBand {
  if (score < PREFLIGHT_BLOCK) return 'blocked';
  return score >= PREFLIGHT_GOOD ? 'good' : 'fix';
}

export const PREFLIGHT_SEVERITIES = ['info', 'warn', 'block'] as const;
export type PreflightSeverity = (typeof PREFLIGHT_SEVERITIES)[number];

export const PreflightFindingObj = z.object({
  /** Stable machine code, e.g. "subject-caps", "base64-image". */
  code: z.string(),
  severity: z.enum(PREFLIGHT_SEVERITIES),
  /** What was found, user-facing. */
  message: z.string(),
  /** How to fix it, user-facing. */
  hint: z.string(),
  /** Points subtracted from the 100-point score. 0 for purely informational rows. */
  deduction: z.number(),
});
export type PreflightFinding = z.infer<typeof PreflightFindingObj>;

/**
 * Content classes the AI reviewer sorts a newsletter into. Fundraising, donations, auctions,
 * events and advocacy are all legitimate for this product (campaigns and nonprofits); only pure
 * commercial marketing and scam/phishing patterns are out of scope per EULA §7.
 */
export const AI_CONTENT_TYPES = [
  'newsletter_update',
  'fundraising_appeal',
  'event_promotion',
  'auction_or_sale',
  'advocacy',
  'pure_commercial_marketing',
  'scam_or_phishing',
  'other',
] as const;
export type AiContentType = (typeof AI_CONTENT_TYPES)[number];

/** Structured verdict returned by the Claude content review (also its output-format schema). */
export const AiPreflightVerdictObj = z.object({
  contentType: z.enum(AI_CONTENT_TYPES),
  /** 0 (clean) to 100 (reads like spam). */
  spamRiskScore: z.number().min(0).max(100),
  /** Short reasons behind the risk score, user-facing. */
  reasons: z.array(z.string()),
  /** Deceptive-pattern flags: fake urgency, misleading claims, impersonation, credential-bait. */
  deceptionFlags: z.array(z.string()),
  /** Concrete copy rewrites for the worst offenders, user-facing. */
  suggestions: z.array(z.string()),
  /** The model's confidence in this verdict, 0–1. */
  confidence: z.number().min(0).max(1),
});
export type AiPreflightVerdict = z.infer<typeof AiPreflightVerdictObj>;

/** Input to the preflight check — raw composer content (no newsletter row needs to exist yet). */
export const RunPreflightObj = z.object({
  subject: z.string().max(500),
  html: z.string().max(500_000),
  plainText: z.string().max(200_000).optional(),
});
export type RunPreflightType = z.infer<typeof RunPreflightObj>;

/**
 * How the AI review figured in a result: it ran ('reviewed'); it was wanted but couldn't run —
 * no API key or the API errored — so the score is partial ('unavailable'); or policy didn't call
 * for it ('not_required' — the send-time gate skips the AI re-check for established paid tenants,
 * while user-initiated checks always include it).
 */
export const AI_REVIEW_STATUSES = ['reviewed', 'unavailable', 'not_required'] as const;
export type AiReviewStatus = (typeof AI_REVIEW_STATUSES)[number];

/** Full preflight outcome: the score, its band, and every finding that shaped it. */
export const PreflightResultObj = z.object({
  score: z.number(),
  band: z.enum(PREFLIGHT_BANDS),
  findings: z.array(PreflightFindingObj),
  /** SpamAssassin score from the Postmark spamcheck API, when that layer ran. */
  spamAssassinScore: z.number().nullable(),
  ai: AiPreflightVerdictObj.nullable(),
  aiStatus: z.enum(AI_REVIEW_STATUSES),
  checkedAt: z.string(),
});
export type PreflightResult = z.infer<typeof PreflightResultObj>;
