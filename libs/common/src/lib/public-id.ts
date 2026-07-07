import { slugifyRecordName } from './utils';

/**
 * Opaque public identifiers for person records (spec §1 security surface).
 *
 * Unlike households/companies, persons do NOT use a name slug: at 100k+ people
 * name slugs collide (`amira-hassan-4787`), leak counts, and put real names in
 * URLs and logs — bad for a political CRM. Instead each person carries an
 * opaque `public_id`: 8 Crockford Base32 characters encoding 40 bits from a
 * CSPRNG (`crypto.randomBytes(5)` on the backend), stored uppercase-canonical
 * (e.g. `4T9K2XPM`).
 *
 * The URL display form (what the browser shows) is `{name}-{XXXX}-{XXXX}`, e.g.
 * `/people/joseph-4t9k-2xpm`: a decorative slugified first/last name followed by
 * the public_id split 4-4. The name is cosmetic — resolution strips it and looks
 * up by public_id only, so a stale name in an old URL still resolves.
 *
 * These helpers are shared by the frontend resolver and the backend so decode
 * and slug-building stay identical on both sides. Generation (randomBytes +
 * retry-on-collision) is backend-only — see
 * `apps/backend/src/app/lib/person-public-id.ts`.
 */

/** Crockford Base32 alphabet — excludes I, L, O, U to avoid visual/spoken ambiguity. */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Canonical public_id length in characters (40 bits / 5 bits-per-char = 8). */
export const PUBLIC_ID_LENGTH = 8;

const CROCKFORD_SET = new Set(CROCKFORD_ALPHABET);

/**
 * Encode raw bytes to Crockford Base32 (big-endian, no padding). 5 bytes
 * (40 bits) produce exactly 8 characters. Bit accumulation is masked to stay
 * within JS's 32-bit bitwise range, so this is correct for any byte length.
 */
export function encodeCrockford(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += CROCKFORD_ALPHABET[(value >>> bits) & 31];
    }
    // Keep only the bits not yet emitted so `value` never exceeds ~12 bits.
    value &= (1 << bits) - 1;
  }
  if (bits > 0) {
    output += CROCKFORD_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Normalize a Crockford string to canonical form: uppercase, map the
 * confusable letters back to digits (I/L → 1, O → 0), and drop any character
 * outside the alphabet (hyphens, spaces, etc.). The result contains only
 * canonical alphabet characters.
 */
export function normalizeCrockford(input: string): string {
  let output = '';
  for (const raw of input.toUpperCase()) {
    let ch = raw;
    if (ch === 'O') ch = '0';
    else if (ch === 'I' || ch === 'L') ch = '1';
    if (CROCKFORD_SET.has(ch)) output += ch;
  }
  return output;
}

/**
 * Decode a URL segment to a canonical person public_id, or `null` when it does
 * not contain one. Strips all hyphens, takes the last {@link PUBLIC_ID_LENGTH}
 * characters (the public_id is always appended last), then Crockford-normalizes.
 * Robust to a decorative name that itself contains hyphens (`mary-jane-4t9k-2xpm`
 * → `4T9K2XPM`), a bare id (`4t9k2xpm`), and a hyphenated bare id (`4T9K-2XPM`).
 */
export function extractPublicIdFromSlug(segment: string): string | null {
  const stripped = segment.replace(/-/g, '');
  const tail = stripped.slice(-PUBLIC_ID_LENGTH);
  const normalized = normalizeCrockford(tail);
  return normalized.length === PUBLIC_ID_LENGTH ? normalized : null;
}

/**
 * Build the person URL display slug `{name}-{xxxx}-{xxxx}` from a canonical
 * public_id. The decorative name is the slugified first name, else last name,
 * else the literal `person`. The id is lowercased and split 4-4 for readability
 * (e.g. `joseph-4t9k-2xpm`). Resolution ignores the name entirely.
 */
export function buildPersonSlug(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  publicId: string,
): string {
  const source = (firstName ?? '').trim() || (lastName ?? '').trim();
  const name = slugifyRecordName(source, 'person');
  const id = publicId.toLowerCase();
  return `${name}-${id.slice(0, 4)}-${id.slice(4, PUBLIC_ID_LENGTH)}`;
}
