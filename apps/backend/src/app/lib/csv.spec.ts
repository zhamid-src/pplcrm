import { describe, it, expect } from 'vitest';

import { escapeCsvCell, rowsToCsv } from './csv';

/** The value a CSV parser would read back for a single cell (unwrap RFC-4180 quoting). */
function parsedCell(cell: string): string {
  return cell.startsWith('"') && cell.endsWith('"') ? cell.slice(1, -1).replace(/""/g, '"') : cell;
}

describe('escapeCsvCell — formula injection guard (SECURITY-REVIEW.md 1.5)', () => {
  it.each(['=HYPERLINK("http://evil","x")', '+1+1', '-2+3', '@SUM(A1:A9)', '\tcmd', '\rformula'])(
    'neutralizes a leading formula character in %j',
    (input) => {
      // Once a spreadsheet unquotes the cell, it must begin with the text-forcing
      // apostrophe rather than the original formula trigger.
      expect(parsedCell(escapeCsvCell(input)).startsWith("'")).toBe(true);
    },
  );

  it('quotes a neutralized value that also needs RFC-4180 quoting', () => {
    // Leading '=' triggers the guard; the embedded comma forces quoting.
    expect(escapeCsvCell('=1,2')).toBe('"\'=1,2"');
  });

  it('leaves ordinary strings untouched', () => {
    expect(escapeCsvCell('Jane Doe')).toBe('Jane Doe');
    expect(escapeCsvCell('normal text')).toBe('normal text');
  });

  it('does not mangle real numbers, including negatives', () => {
    expect(escapeCsvCell(-5)).toBe('-5');
    expect(escapeCsvCell(42)).toBe('42');
    expect(escapeCsvCell(true)).toBe('true');
  });

  it('emits empty string for null/undefined and ISO for dates', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
    expect(escapeCsvCell(new Date('2026-01-02T03:04:05.000Z'))).toBe('2026-01-02T03:04:05.000Z');
  });
});

describe('rowsToCsv', () => {
  it('neutralizes a malicious cell in a full row', () => {
    const csv = rowsToCsv([{ first_name: '=cmd|/c calc', last_name: 'Doe' }], ['first_name', 'last_name']);
    const [, dataLine] = csv.split('\n');
    expect(dataLine).toBe("'=cmd|/c calc,Doe");
  });

  it('returns empty string when no columns are given', () => {
    expect(rowsToCsv([{ a: 1 }], [])).toBe('');
  });
});
