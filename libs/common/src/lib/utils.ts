export function debounce<F extends (...args: any[]) => void>(fn: F, delay = 300) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Subdomain labels that must never be assigned to a tenant — they collide with app/infra hosts.
 * A tenant's slug becomes `<slug>.<baseDomain>`, so the public form page can resolve the tenant
 * from the Host header; these labels are reserved so a tenant can't shadow `app`, `api`, etc.
 */
export const RESERVED_SUBDOMAINS = new Set<string>([
  'app',
  'www',
  'api',
  'admin',
  'mail',
  'email',
  'ftp',
  'smtp',
  'imap',
  'pop',
  'ns',
  'ns1',
  'ns2',
  'dns',
  'mx',
  'static',
  'assets',
  'cdn',
  'media',
  'files',
  'download',
  'downloads',
  'status',
  'help',
  'support',
  'docs',
  'blog',
  'dev',
  'staging',
  'stage',
  'test',
  'demo',
  'sandbox',
  'portal',
  'dashboard',
  'account',
  'accounts',
  'billing',
  'pay',
  'payments',
  'auth',
  'login',
  'logout',
  'signup',
  'signin',
  'register',
  'public',
  'forms',
  'f',
  'localhost',
  'root',
  'system',
]);

/**
 * Turn a name into a DNS-safe subdomain label: lowercase, ASCII alphanumerics + single hyphens,
 * no leading/trailing hyphen, capped at 40 chars. Returns '' when nothing usable remains — callers
 * must fall back (e.g. `t-<id>`) and check {@link RESERVED_SUBDOMAINS}.
 */
export function slugifyHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/**
 * Escape a string for safe interpolation into HTML markup (element text or
 * double/single-quoted attribute values).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
