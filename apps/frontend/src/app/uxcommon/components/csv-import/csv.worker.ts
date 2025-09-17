// CSV/TSV parsing web worker (shared)
// Receives: { type: 'parse', text: string }
// Posts: { type: 'result', headers: string[], rows: Array<Record<string,string>> } or { type: 'error', message }

// eslint-disable-next-line no-restricted-globals
function detectDelimiter(sample: string[]) {
  const candidates = [',', '\t', ';'];
  let best: { ch: string; score: number } = { ch: ',', score: -1 };
  for (const ch of candidates) {
    let score = 0;
    for (let i = 0; i < Math.min(sample.length, 5); i++) {
      const line = sample[i] ?? '';
      if (/^\s*Page\s+\d+\s+of\s+\d+\s*$/i.test(line)) continue;
      score += line.split(ch).length - 1 || 0;
    }
    if (score > best.score) best = { ch, score };
  }
  return best.ch;
}

function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

const ctx = self as any;

ctx.onmessage = (e: MessageEvent) => {
  try {
    const { type, text } = e.data || {};
    if (type !== 'parse' || typeof text !== 'string') return;

    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const delimiter = detectDelimiter(lines);
    const headerLine = lines.find((l) => !!l && !/^\s*Page\s+\d+\s+of\s+\d+\s*$/i.test(l)) || '';
    const headers = splitLine(headerLine, delimiter);
    const rows: Array<Record<string, string>> = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      if (!rawLine) continue;
      if (rawLine === headerLine) continue;
      if (/^\s*Page\s+\d+\s+of\s+\d+\s*$/i.test(rawLine)) continue;
      const cols = splitLine(rawLine, delimiter);
      if (cols.every((c) => !c || c.trim().length === 0)) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => (row[h] = cols[idx] ?? ''));
      rows.push(row);
    }

    ctx.postMessage({ type: 'result', headers, rows });
  } catch (err: any) {
    ctx.postMessage({ type: 'error', message: err?.message || 'Parse failed' });
  }
};

