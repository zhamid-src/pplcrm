import { afterNextRender, computed, Injectable, signal } from '@angular/core';
import {
  currencyForCountry,
  currencyPriceSymbol,
  formatCurrency,
  isCurrencyCode,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type CurrencyDef,
  type ExchangeRates,
} from '@common';

/** localStorage key for the visitor's manual currency choice (overrides geo detection). */
const STORAGE_CURRENCY = 'pc_currency';
/** localStorage key for the cached FX rates + fetch timestamp. */
const STORAGE_FX = 'pc_fx';
/** How long cached rates stay fresh before we refetch (12 hours), matching the edge cache. */
const FX_TTL_MS = 12 * 60 * 60 * 1000;
/** Same-origin Cloudflare Pages Function that returns `{ country, rates }`. */
const GEO_ENDPOINT = '/api/geo-rates';
/** Public CORS-enabled FX source used only as a fallback when the edge endpoint is unavailable
 * (local dev, or before the Pages Function is wired). USD base, no key. */
const FX_DIRECT_URL = 'https://open.er-api.com/v6/latest/USD';

interface CachedFx {
  readonly rates: ExchangeRates;
  readonly ts: number;
}

/**
 * Picks which currency the marketing site displays prices in, and converts USD prices to it at
 * live exchange rates. Billing is always USD — surfaces show a disclaimer via {@link isConverted}.
 *
 * Browser-only work (reading storage, detecting region, fetching rates) runs in `afterNextRender`,
 * exactly like {@link AuthHint}: the prerendered (SSG) markup is always USD and the client
 * re-prices after hydration, so there's no server/client mismatch. Everything degrades safely —
 * if the geo/rate call fails we fall back to the browser locale, and with no rates we stay in USD.
 */
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  /** The active display currency (USD until detection/override resolves after hydration). */
  public readonly currency = signal<CurrencyCode>('USD');
  /** USD-base rates; USD is always 1, other codes appear once loaded. */
  public readonly rates = signal<ExchangeRates>({ USD: 1 });

  /** The currencies offered in the switcher. */
  public readonly options: readonly CurrencyDef[] = Object.values(SUPPORTED_CURRENCIES);
  /** The active currency's display metadata (for the switcher trigger). */
  public readonly active = computed<CurrencyDef>(() => SUPPORTED_CURRENCIES[this.currency()]);
  /** The active currency's price symbol (e.g. `C$`), for inline copy like the disclaimer. */
  public readonly priceSymbol = computed<string>(() => currencyPriceSymbol(this.currency()));

  /** True only when we're actually converting away from USD (a rate for the currency is loaded).
   * Gates the "billed in USD" disclaimer so it never shows while prices are still really USD. */
  public readonly isConverted = computed<boolean>(() => {
    const code = this.currency();
    return code !== 'USD' && this.rates()[code] != null;
  });

  constructor() {
    afterNextRender(() => this.init());
  }

  /** Set and persist the visitor's manual currency choice. */
  public setCurrency(code: CurrencyCode): void {
    this.currency.set(code);
    try {
      localStorage.setItem(STORAGE_CURRENCY, code);
    } catch {
      // Storage unavailable (private mode): the choice still applies for this session.
    }
  }

  /** Format a whole-dollar USD price in the active currency; falls back to USD when no rate. */
  public format(usd: number): string {
    const code = this.currency();
    const rate = code === 'USD' ? 1 : this.rates()[code];
    if (rate == null) return formatCurrency(usd, 'USD');
    return formatCurrency(Math.round(usd * rate), code);
  }

  /** Rounded monthly-equivalent of an annual USD total, in the active currency (`$24`). The
   * annual total is converted to whole units first, then divided by 12 and rounded — surfaces
   * showing it must keep the exact annual total alongside plus the rounding disclaimer, since
   * equivalent × 12 ≠ the billed total. */
  public formatMonthlyEquivalent(annualUsd: number): string {
    const code = this.currency();
    const rate = code === 'USD' ? 1 : this.rates()[code];
    if (rate == null) return formatCurrency(Math.round(annualUsd / 12), 'USD');
    return formatCurrency(Math.round(Math.round(annualUsd * rate) / 12), code);
  }

  private init(): void {
    const override = this.readOverride();
    if (override) this.currency.set(override);

    const cached = this.readCachedRates();
    if (cached) this.rates.set(cached);

    void this.refresh(override != null);
  }

  /** Fetch fresh geo + rates; set the currency from geo only when there's no manual override. */
  private async refresh(hasOverride: boolean): Promise<void> {
    try {
      const res = await fetch(GEO_ENDPOINT, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`geo-rates ${res.status}`);
      const { country, rates } = this.parsePayload(await res.json());
      this.rates.set(rates);
      this.writeCachedRates(rates);
      if (!hasOverride) this.applyDetected(currencyForCountry(country), rates);
    } catch {
      // Edge endpoint unavailable (local dev, or not wired yet): fetch rates directly from the
      // public FX API and detect the region from the browser locale instead of the visitor's IP.
      const rates = await this.fetchRatesDirect();
      if (rates) {
        this.rates.set(rates);
        this.writeCachedRates(rates);
      }
      // Only switch if we actually have a rate for the detected currency, else stay in USD.
      if (!hasOverride) this.applyDetected(currencyForCountry(this.regionFromLocale()), this.rates());
    }
  }

  /** Fallback rate source when the edge endpoint fails. Queries a public CORS FX API straight from
   * the browser; returns null on any failure so we simply stay in USD. */
  private async fetchRatesDirect(): Promise<ExchangeRates | null> {
    try {
      const res = await fetch(FX_DIRECT_URL, { headers: { accept: 'application/json' } });
      if (!res.ok) return null;
      const body: unknown = await res.json();
      const table =
        typeof body === 'object' && body !== null && 'rates' in body ? (body as { rates: unknown }).rates : null;
      return this.sanitizeRates(table);
    } catch {
      return null;
    }
  }

  /** Adopt a geo/locale-detected currency only when a rate for it is available. */
  private applyDetected(code: CurrencyCode, rates: ExchangeRates): void {
    if (code === 'USD' || rates[code] != null) this.currency.set(code);
  }

  private readOverride(): CurrencyCode | null {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENCY);
      return raw && isCurrencyCode(raw) ? raw : null;
    } catch {
      return null;
    }
  }

  private readCachedRates(): ExchangeRates | null {
    try {
      const raw = localStorage.getItem(STORAGE_FX);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      const { rates, ts } = parsed as Partial<CachedFx>;
      if (typeof ts !== 'number' || Date.now() - ts > FX_TTL_MS) return null;
      return this.sanitizeRates(rates);
    } catch {
      return null;
    }
  }

  private writeCachedRates(rates: ExchangeRates): void {
    try {
      const entry: CachedFx = { rates, ts: Date.now() };
      localStorage.setItem(STORAGE_FX, JSON.stringify(entry));
    } catch {
      // Non-fatal: we just refetch next visit.
    }
  }

  /** Validate the Pages Function response into a country + sanitized rates. */
  private parsePayload(body: unknown): { country: string | null; rates: ExchangeRates } {
    if (typeof body !== 'object' || body === null) return { country: null, rates: { USD: 1 } };
    const record = body as { country?: unknown; rates?: unknown };
    const country = typeof record.country === 'string' ? record.country : null;
    return { country, rates: this.sanitizeRates(record.rates) };
  }

  /** Keep only positive numeric rates for known currency codes; USD is always 1. */
  private sanitizeRates(raw: unknown): ExchangeRates {
    const clean: ExchangeRates = { USD: 1 };
    if (typeof raw !== 'object' || raw === null) return clean;
    const record = raw as Record<string, unknown>;
    for (const def of this.options) {
      if (def.code === 'USD') continue;
      const value = record[def.code];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) clean[def.code] = value;
    }
    return clean;
  }

  /** Region subtag from the browser locale (e.g. "en-GB" → "GB"), or null. */
  private regionFromLocale(): string | null {
    const locale = typeof navigator !== 'undefined' ? navigator.language : '';
    const region = locale.split('-')[1];
    return region ? region.toUpperCase() : null;
  }
}
