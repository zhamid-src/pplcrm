/**
 * Escape a single value for one CSV cell.
 *
 * Two concerns:
 *  1. RFC-4180 quoting — wrap in double quotes and double any embedded quotes when
 *     the value contains a comma, quote, or newline/carriage-return.
 *  2. Spreadsheet formula (CSV) injection — a *string* cell whose first character
 *     is one a spreadsheet treats as the start of a formula (`= + - @`) or a
 *     leading tab/CR (which some apps strip before parsing) is prefixed with a
 *     single quote so Excel/Sheets render it as text instead of executing it.
 *     Person names/notes/tags are attacker-controllable (public form, Zapier), so
 *     an unescaped `=HYPERLINK(...)` / `=cmd|...` would run on a staffer's machine
 *     when they open the export.
 *
 * Numbers, booleans, bigints, and dates are emitted verbatim so genuine numeric
 * columns (including negatives like `-5`) are never turned into quoted text.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);

  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const guarded = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;

  return /[",\n\r]/.test(guarded) ? '"' + guarded.replace(/"/g, '""') + '"' : guarded;
}

export function rowsToCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  if (!columns.length) return '';

  const header = columns.join(',');
  const data = rows.map((row) => columns.map((col) => escapeCsvCell(row[col])).join(','));
  return [header, ...data].join('\n');
}
