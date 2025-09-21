export function rowsToCsv(rows: Array<Record<string, any>>, columns: string[]): string {
  if (!columns.length) return '';

  const escape = (value: unknown) => {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    const str = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? '"' + str.replace(/"/g, '""') + '"'
      : str;
  };

  const header = columns.join(',');
  const data = rows.map((row) => columns.map((col) => escape((row as Record<string, unknown>)[col])).join(','));
  return [header, ...data].join('\n');
}
