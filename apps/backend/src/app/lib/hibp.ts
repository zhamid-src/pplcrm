import { createHash } from 'crypto';

// Fail open — returns 0 if HIBP API is unreachable, so an outage never blocks users
export async function getPwnedCount(password: string): Promise<number> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return 0;
    const text = await res.text();
    const line = text.split('\n').find((l) => l.startsWith(suffix));
    if (!line) return 0;
    return parseInt(line.split(':')[1] ?? '0', 10);
  } catch {
    return 0;
  }
}
