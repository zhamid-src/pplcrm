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

const SYSTEM_TAG_COLOURS: Record<string, string> = {
  volunteer: '#0ea5e9',
  donor: '#f97316',
  supporter: '#10b981',
  'non-supporter': '#f87171',
  undecided: '#a855f7',
  subscriber: '#14b8a6',
  unsubscribed: '#6b7280',
  'do-not-contact': '#111827',
  staff: '#2563eb',
  vip: '#facc15',
};

export const SYSTEM_TAG_SEED_DATA = SYSTEM_TAG_NAMES.map((name) => ({
  name,
  description: null as string | null,
  color: SYSTEM_TAG_COLOURS[name] ?? null,
}));
