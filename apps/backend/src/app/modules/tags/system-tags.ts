/**
 * Tags are freeform tenant-level organization. Anything with a fixed enum, a
 * single value per person, machine updates, or send/knock logic is a structured
 * concept instead (Campaigns §15): supporter/non-supporter/undecided became the
 * per-campaign support level, do-not-contact became a person flag,
 * subscriber/unsubscribed became campaign_subscriptions rows, and donor is
 * derived from the donations table. All were retired as tags by the
 * 2026-07-14/15/16 migrations.
 */
export const SYSTEM_TAG_NAMES = ['volunteer', 'staff'] as const;

const normalize = (value: string) => value.trim().toLowerCase();

const canonicalNameMap = new Map<string, string>(SYSTEM_TAG_NAMES.map((name) => [normalize(name), name]));

export const SYSTEM_TAG_SET = new Set<string>(canonicalNameMap.keys());

export function getCanonicalSystemTagName(name: string) {
  return canonicalNameMap.get(normalize(name));
}

export function isSystemTag(name: string) {
  return SYSTEM_TAG_SET.has(normalize(name));
}

const SYSTEM_TAG_COLOURS: Record<string, string> = {
  volunteer: '#0ea5e9',
  staff: '#2563eb',
};

export const SYSTEM_TAG_SEED_DATA = SYSTEM_TAG_NAMES.map((name) => ({
  name,
  description: null as string | null,
  color: SYSTEM_TAG_COLOURS[name] ?? null,
}));
