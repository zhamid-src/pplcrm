/**
 * Display-currency helpers for the marketing website.
 *
 * The single source of truth for prices is USD ({@link ./plans.ts}). These helpers let the
 * marketing site *show* those USD prices converted to a handful of local currencies at live
 * exchange rates, purely for the visitor's convenience. Billing is always in USD — the pricing
 * page carries that disclaimer whenever a non-USD currency is shown.
 *
 * Everything here is framework-agnostic (no Angular): the Angular service that fetches rates and
 * detects the visitor's region lives in the website app (ui/currency.service.ts). Conversion is
 * rounded to whole currency units — these are estimates, and whole numbers read cleanly next to
 * the "billed in USD" note.
 */

/** The currencies the marketing site can display prices in. USD is the billing currency. */
export const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CAD'] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export interface CurrencyDef {
  readonly code: CurrencyCode;
  /** The symbol shown in the switcher trigger, disambiguated across currencies (CA$ vs $). */
  readonly symbol: string;
  /** Human label for the switcher menu. */
  readonly label: string;
}

/** Per-currency display metadata, keyed by code. The symbol is the plain currency glyph; the
 * ISO code disambiguates the shared `$` (USD vs CAD), shown alongside the symbol. */
export const SUPPORTED_CURRENCIES: Readonly<Record<CurrencyCode, CurrencyDef>> = {
  USD: { code: 'USD', symbol: '$', label: 'US dollar' },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', label: 'British pound' },
  CAD: { code: 'CAD', symbol: '$', label: 'Canadian dollar' },
};

/** Locale used for number grouping in formatted prices (fixed for consistent English
 * presentation on the marketing site). */
const FORMAT_LOCALE = 'en-US';

/** Symbols used when formatting a *price* (e.g. `C$41` in the pricing table). CAD uses `C$` to
 * distinguish it from USD's `$`. This is separate from `SUPPORTED_CURRENCIES[code].symbol`, which
 * is the switcher-menu symbol paired with the ISO code there (`$ CAD`). */
const PRICE_SYMBOLS: Readonly<Record<CurrencyCode, string>> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
};

/** Rates relative to USD (USD is always 1). Absent codes mean "rate not loaded yet". */
export type ExchangeRates = Partial<Record<CurrencyCode, number>>;

/** Type guard: is a string one of our supported currency codes? */
export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(value);
}

/**
 * ISO-3166 alpha-2 country codes that map to a non-USD display currency. Eurozone members map to
 * EUR; GB → GBP; CA → CAD. Every country not listed falls back to USD (see `currencyForCountry`).
 */
export const COUNTRY_TO_CURRENCY: Readonly<Record<string, CurrencyCode>> = {
  GB: 'GBP',
  CA: 'CAD',
  // Eurozone (the 20 EUR members).
  AT: 'EUR',
  BE: 'EUR',
  HR: 'EUR',
  CY: 'EUR',
  EE: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  GR: 'EUR',
  IE: 'EUR',
  IT: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  ES: 'EUR',
};

/** Resolve a country code (from geo-IP or a locale region) to a display currency; default USD. */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  if (!country) return 'USD';
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? 'USD';
}

/**
 * Convert a whole-dollar USD amount to `code` at the given rates, rounded to whole units.
 * Falls back to the original amount when the rate for `code` is missing (treated as USD).
 */
export function convertFromUsd(usd: number, code: CurrencyCode, rates: ExchangeRates): number {
  const rate = code === 'USD' ? 1 : rates[code];
  if (rate == null) return Math.round(usd);
  return Math.round(usd * rate);
}

/** The price symbol for a currency (e.g. `C$` for CAD), for copy that references the currency
 * inline — kept consistent with `formatCurrency`'s output. */
export function currencyPriceSymbol(code: CurrencyCode): string {
  return PRICE_SYMBOLS[code];
}

/** Format a whole-unit amount as a price with a disambiguated symbol and no fractional part
 * (e.g. `$69`, `C$95`, `€65`, `£55`). */
export function formatCurrency(amount: number, code: CurrencyCode): string {
  const number = new Intl.NumberFormat(FORMAT_LOCALE, { maximumFractionDigits: 0 }).format(amount);
  return `${currencyPriceSymbol(code)}${number}`;
}

/** Format an amount as a price with exactly two fractional digits (e.g. `$24.17`, `C$33.08`).
 * Used for annual billing's monthly-equivalent display, where the cents are the honest part of
 * the number — everything else on the site stays whole-unit via `formatCurrency`. */
export function formatCurrencyExact(amount: number, code: CurrencyCode): string {
  const number = new Intl.NumberFormat(FORMAT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${currencyPriceSymbol(code)}${number}`;
}
