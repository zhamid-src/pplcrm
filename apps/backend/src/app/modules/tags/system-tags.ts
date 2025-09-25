export const SYSTEM_TAG_NAMES = [
  'volunteer',
  'donor',
  'supporter',
  'non-supporter',
  'undecided',
  'subscriber',
  'unsubscribed',
  'do-not-contact',
  'staff',
  'vip',
] as const;

const normalize = (value: string) => value.trim().toLowerCase();

const canonicalNameMap = new Map<string, string>(
  SYSTEM_TAG_NAMES.map((name) => [normalize(name), name]),
);

export const SYSTEM_TAG_SET = new Set<string>(canonicalNameMap.keys());

export function getCanonicalSystemTagName(name: string) {
  return canonicalNameMap.get(normalize(name));
}

export function isSystemTag(name: string) {
  return SYSTEM_TAG_SET.has(normalize(name));
}

export const SYSTEM_TAG_SEED_DATA = SYSTEM_TAG_NAMES.map((name) => ({
  name,
  description: null as string | null,
}));
