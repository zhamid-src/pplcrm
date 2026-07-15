import crypto from 'crypto';

import { ServerMisconfigError } from '../../../errors/app-errors';
import type { CheckoutInit, DonationProcessor, OneTimeCheckoutParams } from './donation-processor';

// SDK-less HTTP integration (mirrors the plain-`fetch` style of newsletter-mail.service.ts).
const HELCIM_API_BASE = 'https://api.helcim.com/v2';
const INVOICE_PREFIX = 'pplcrm';

export type HelcimCurrency = 'CAD' | 'USD';

/** Verified/normalized Helcim card transaction (subset we act on). */
export interface HelcimTransaction {
  transactionId: string;
  status: string; // e.g. 'APPROVED' | 'DECLINED'
  amount: number; // dollars
  currency: string;
  invoiceNumber: string | null;
  customerCode: string | null;
}

export interface HelcimWebhookHeaders {
  'webhook-id': string;
  'webhook-timestamp': string;
  'webhook-signature': string;
}

/**
 * The Helcim webhook body is thin (`{ id, type }`) and carries no tenant/person context, so we
 * round-trip the identifiers we need through the `invoiceNumber` we set at init. Encoded as
 * `pplcrm_<tenantId>_<personId>_<amountCents>` and read back off the fetched transaction.
 */
export function encodeHelcimInvoiceNumber(tenantId: string, personId: string, amountCents: number): string {
  return `${INVOICE_PREFIX}_${tenantId}_${personId}_${amountCents}`;
}

export function decodeHelcimInvoiceNumber(
  invoiceNumber: string | null | undefined,
): { tenantId: string; personId: string; amountCents: number } | null {
  if (!invoiceNumber) return null;
  const parts = invoiceNumber.split('_');
  if (parts.length !== 4 || parts[0] !== INVOICE_PREFIX) return null;
  const [, tenantId, personId, amountRaw] = parts;
  const amountCents = Number(amountRaw);
  if (!tenantId || !personId || !Number.isFinite(amountCents)) return null;
  return { tenantId, personId, amountCents };
}

function readString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Constant-time compare of two base64 signature strings (unequal lengths short-circuit to false). */
function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * The `webhook-signature` header may be a single base64 signature or a space-separated list of
 * `v1,<base64sig>` entries (Svix-style, which Helcim uses). Accept a match against any entry.
 */
function signatureHeaderMatches(header: string, expected: string): boolean {
  const entries = header.trim().split(/\s+/);
  for (const entry of entries) {
    const sig = entry.includes(',') ? entry.slice(entry.indexOf(',') + 1) : entry;
    if (sig && timingSafeEqualStr(sig, expected)) return true;
  }
  return false;
}

/**
 * Helcim one-time checkout adapter. Calls the HelcimPay initialize endpoint and returns a
 * `helcim_pay` checkout token that the client uses to launch the HelcimPay.js modal (NOT a redirect).
 */
export class HelcimDonationProcessor implements DonationProcessor {
  constructor(
    private readonly apiToken: string,
    private readonly currency: HelcimCurrency = 'CAD',
  ) {}

  public async createOneTimeCheckout(params: OneTimeCheckoutParams): Promise<CheckoutInit> {
    if (!this.apiToken) {
      throw new ServerMisconfigError('Helcim is not configured for this organization.');
    }

    // Helcim expects the amount in dollars; the rest of the app works in cents.
    const amountDollars = Math.round(params.amountCents) / 100;
    const invoiceNumber = encodeHelcimInvoiceNumber(params.tenantId, params.personId, params.amountCents);

    const response = await fetch(`${HELCIM_API_BASE}/helcim-pay/initialize`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-token': this.apiToken,
      },
      body: JSON.stringify({
        paymentType: 'purchase',
        amount: amountDollars,
        currency: this.currency,
        invoiceNumber,
        customerCode: params.personId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Helcim initialize failed (${response.status}): ${errorText}`);
    }

    const data: unknown = await response.json();
    const checkoutToken = isRecord(data) ? readString(data, 'checkoutToken') : null;
    if (!checkoutToken) {
      throw new Error('Helcim initialize returned no checkoutToken.');
    }

    return { kind: 'helcim_pay', checkoutToken };
  }

  /**
   * Verify a Helcim webhook signature. `signature = base64( HMAC-SHA256( key = base64decode(
   * verifierToken), msg = `${webhook-id}.${webhook-timestamp}.${rawBody}` ) )`. Timing-safe.
   */
  public static verifyWebhook(headers: HelcimWebhookHeaders, rawBody: string, verifierToken: string): boolean {
    const id = headers['webhook-id'];
    const timestamp = headers['webhook-timestamp'];
    const signature = headers['webhook-signature'];
    if (!id || !timestamp || !signature || !verifierToken) return false;

    const key = Buffer.from(verifierToken, 'base64');
    const message = `${id}.${timestamp}.${rawBody}`;
    const expected = crypto.createHmac('sha256', key).update(message).digest('base64');
    return signatureHeaderMatches(signature, expected);
  }

  /** Fetch the full transaction after a verified webhook to get amount/currency/status/invoice. */
  public static async fetchTransaction(id: string, apiToken: string): Promise<HelcimTransaction> {
    const response = await fetch(`${HELCIM_API_BASE}/card-transactions/${encodeURIComponent(id)}`, {
      headers: {
        accept: 'application/json',
        'api-token': apiToken,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Helcim card-transaction fetch failed (${response.status}): ${errorText}`);
    }
    const data: unknown = await response.json();
    if (!isRecord(data)) {
      throw new Error('Helcim card-transaction response was not an object.');
    }
    return {
      transactionId: readString(data, 'transactionId') ?? String(id),
      status: readString(data, 'status') ?? '',
      amount: Number(data['amount'] ?? 0),
      currency: readString(data, 'currency') ?? '',
      invoiceNumber: readString(data, 'invoiceNumber'),
      customerCode: readString(data, 'customerCode'),
    };
  }
}
