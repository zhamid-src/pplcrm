import { describe, it, expect } from 'vitest';
import {
  CROCKFORD_ALPHABET,
  PUBLIC_ID_LENGTH,
  buildPersonSlug,
  encodeCrockford,
  extractPublicIdFromSlug,
  normalizeCrockford,
} from './public-id';

describe('encodeCrockford', () => {
  it('encodes 5 bytes to exactly 8 Crockford characters', () => {
    const id = encodeCrockford(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a]));
    expect(id).toHaveLength(PUBLIC_ID_LENGTH);
    for (const ch of id) expect(CROCKFORD_ALPHABET).toContain(ch);
  });

  it('encodes all-zero bytes to all zeros', () => {
    expect(encodeCrockford(new Uint8Array([0, 0, 0, 0, 0]))).toBe('00000000');
  });

  it('encodes all-ones bytes to all Z (top of alphabet)', () => {
    expect(encodeCrockford(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff]))).toBe('ZZZZZZZZ');
  });

  it('is deterministic for the same input', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    expect(encodeCrockford(bytes)).toBe(encodeCrockford(bytes));
  });
});

describe('normalizeCrockford', () => {
  it('uppercases and maps the confusable letters (I/L → 1, O → 0)', () => {
    expect(normalizeCrockford('oil')).toBe('011');
    expect(normalizeCrockford('4t9k2xpm')).toBe('4T9K2XPM');
  });

  it('strips characters outside the alphabet', () => {
    expect(normalizeCrockford('4T9K-2XPM')).toBe('4T9K2XPM');
    expect(normalizeCrockford('  4t9k 2xpm  ')).toBe('4T9K2XPM');
  });

  it('drops U (not part of Crockford)', () => {
    expect(normalizeCrockford('UU')).toBe('');
  });
});

describe('extractPublicIdFromSlug', () => {
  const CANONICAL = '4T9K2XPM';

  it('extracts from the canonical display slug', () => {
    expect(extractPublicIdFromSlug('joseph-4t9k-2xpm')).toBe(CANONICAL);
  });

  it('extracts when the decorative name contains hyphens', () => {
    expect(extractPublicIdFromSlug('mary-jane-4t9k-2xpm')).toBe(CANONICAL);
  });

  it('resolves a bare lowercase id', () => {
    expect(extractPublicIdFromSlug('4t9k2xpm')).toBe(CANONICAL);
  });

  it('resolves a bare hyphen-split id', () => {
    expect(extractPublicIdFromSlug('4T9K-2XPM')).toBe(CANONICAL);
  });

  it('applies the I/O/L substitution when decoding', () => {
    // A user (or a mis-transcription) typing letters for digits still resolves.
    expect(extractPublicIdFromSlug('joe-oil0-oil0')).toBe('01100110');
  });

  it('returns null when there are fewer than 8 id characters', () => {
    expect(extractPublicIdFromSlug('joe-abc')).toBeNull();
    expect(extractPublicIdFromSlug('')).toBeNull();
  });

  it('is case-insensitive on the whole segment', () => {
    expect(extractPublicIdFromSlug('JOSEPH-4T9K-2XPM')).toBe(CANONICAL);
  });
});

describe('buildPersonSlug', () => {
  it('builds {first}-{xxxx}-{xxxx} with a lowercase split id', () => {
    expect(buildPersonSlug('Joseph', 'Bloggs', '4T9K2XPM')).toBe('joseph-4t9k-2xpm');
  });

  it('falls back to the last name when there is no first name', () => {
    expect(buildPersonSlug(null, 'Hassan', '4T9K2XPM')).toBe('hassan-4t9k-2xpm');
  });

  it('falls back to the literal "person" when there is no name', () => {
    expect(buildPersonSlug('', '   ', '4T9K2XPM')).toBe('person-4t9k-2xpm');
  });

  it('round-trips: the slug it builds decodes back to the same id', () => {
    const id = encodeCrockford(new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x01]));
    const slug = buildPersonSlug('Amira', 'Hassan', id);
    expect(extractPublicIdFromSlug(slug)).toBe(id);
  });

  it('round-trips even when the first name is itself hyphen-heavy', () => {
    const id = encodeCrockford(new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89]));
    const slug = buildPersonSlug('Mary-Jane', 'O’Neil', id);
    expect(extractPublicIdFromSlug(slug)).toBe(id);
  });
});
