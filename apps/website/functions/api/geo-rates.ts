/**
 * Cloudflare Pages Function — GET /api/geo-rates
 *
 * Serves the marketing site's multi-currency pricing (see the website's ui/currency.service.ts).
 * Does both region detection and rate lookup at the edge so the browser makes a single
 * same-origin call — no third-party request from the client, no CORS, no API key shipped to the
 * browser:
 *   - `country` comes from Cloudflare's `request.cf.country` (derived from the visitor's IP).
 *   - `rates` are fetched server-side from a free, no-key FX API (USD base).
 *
 * The response is edge-cached ~12h via `Cache-Control: s-maxage`, so most requests never hit the
 * FX API. This function is intentionally dependency-free (no `@common` import): country→currency
 * mapping and formatting live on the client, so the edge stays a thin data source.
 *
 * Directory-mode Pages Function: it only owns `/api/geo-rates`; static asset serving and the SPA
 * `_redirects` fallback are untouched.
 */

/** Display currencies we return rates for. USD is the billing currency (always 1). */
const RATE_CURRENCIES = ['EUR', 'GBP', 'CAD'] as const;
type RateCurrency = (typeof RATE_CURRENCIES)[number];

/** Free, no-key, USD-base FX source (ECB-backed). Swap here if it ever changes. */
const FX_URL = 'https://open.er-api.com/v6/latest/USD';

/** Edge + browser cache lifetime for the response (12 hours, in seconds). */
const CACHE_SECONDS = 43_200;

/** Minimal shape of the Cloudflare request/context we rely on (avoids a workers-types dep). */
interface CfRequest extends Request {
  readonly cf?: { readonly country?: string };
}
interface PagesContext {
  readonly request: CfRequest;
}

type Rates = { readonly USD: 1 } & Partial<Record<RateCurrency, number>>;

/** Narrow one entry of the FX API's `rates` object to a positive finite number, or undefined. */
function toRate(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Fetch USD-base rates for our display currencies. Returns `{ USD: 1 }` alone on any failure. */
async function fetchRates(): Promise<Rates> {
  const rates: { USD: 1 } & Partial<Record<RateCurrency, number>> = { USD: 1 };
  try {
    const res = await fetch(FX_URL, { headers: { accept: 'application/json' } });
    if (!res.ok) return rates;
    const body: unknown = await res.json();
    const table =
      typeof body === 'object' && body !== null && 'rates' in body ? (body as { rates: unknown }).rates : null;
    if (typeof table !== 'object' || table === null) return rates;
    const record = table as Record<string, unknown>;
    for (const code of RATE_CURRENCIES) {
      const rate = toRate(record[code]);
      if (rate !== undefined) rates[code] = rate;
    }
  } catch {
    // Network/parse failure: fall through with USD-only. The client stays in USD.
  }
  return rates;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const country = context.request.cf?.country ?? null;
  const rates = await fetchRates();
  const payload = JSON.stringify({ country, rates });
  return new Response(payload, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
    },
  });
}
