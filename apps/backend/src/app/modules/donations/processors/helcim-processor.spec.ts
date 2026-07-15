import crypto from 'crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HelcimDonationProcessor, decodeHelcimInvoiceNumber, encodeHelcimInvoiceNumber } from './helcim-processor';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HelcimDonationProcessor.createOneTimeCheckout', () => {
  it('POSTs the initialize request with the expected shape and returns a checkout token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checkoutToken: 'chk_abc123', secretToken: 'sec_xyz' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const processor = new HelcimDonationProcessor('helcim_tok', 'CAD');
    const result = await processor.createOneTimeCheckout({
      tenantId: '42',
      userId: '7',
      personId: '99',
      amountCents: 2500,
      address: { country: 'CA', state: 'ON' },
    });

    expect(result).toEqual({ kind: 'helcim_pay', checkoutToken: 'chk_abc123' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.helcim.com/v2/helcim-pay/initialize');
    expect(init.method).toBe('POST');
    expect(init.headers['api-token']).toBe('helcim_tok');

    const body = JSON.parse(init.body);
    expect(body.paymentType).toBe('purchase');
    expect(body.amount).toBe(25); // cents -> dollars
    expect(body.currency).toBe('CAD');
    expect(body.invoiceNumber).toBe(encodeHelcimInvoiceNumber('42', '99', 2500));
  });

  it('throws when the initialize call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad request' }));
    const processor = new HelcimDonationProcessor('helcim_tok');
    await expect(
      processor.createOneTimeCheckout({
        tenantId: '1',
        userId: '1',
        personId: '1',
        amountCents: 1000,
        address: {},
      }),
    ).rejects.toThrow(/Helcim initialize failed/);
  });

  it('throws (misconfig) when no api token is present', async () => {
    const processor = new HelcimDonationProcessor('');
    await expect(
      processor.createOneTimeCheckout({ tenantId: '1', userId: '1', personId: '1', amountCents: 1000, address: {} }),
    ).rejects.toThrow(/not configured/);
  });
});

describe('invoiceNumber encode/decode round-trip', () => {
  it('round-trips tenant/person/amount', () => {
    const encoded = encodeHelcimInvoiceNumber('42', '99', 2500);
    expect(decodeHelcimInvoiceNumber(encoded)).toEqual({ tenantId: '42', personId: '99', amountCents: 2500 });
  });

  it('rejects malformed invoice numbers', () => {
    expect(decodeHelcimInvoiceNumber(null)).toBeNull();
    expect(decodeHelcimInvoiceNumber('random-string')).toBeNull();
    expect(decodeHelcimInvoiceNumber('other_1_2_3')).toBeNull();
  });
});

describe('HelcimDonationProcessor.verifyWebhook (HMAC)', () => {
  const verifierToken = Buffer.from('super-secret-verifier-key').toString('base64');
  const id = 'msg_123';
  const timestamp = '1700000000';
  const rawBody = '{"id":"9001","type":"cardTransaction"}';

  function sign(vt: string): string {
    const key = Buffer.from(vt, 'base64');
    return crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
  }

  it('accepts a correct signature (known vector)', () => {
    const signature = sign(verifierToken);
    expect(
      HelcimDonationProcessor.verifyWebhook(
        { 'webhook-id': id, 'webhook-timestamp': timestamp, 'webhook-signature': signature },
        rawBody,
        verifierToken,
      ),
    ).toBe(true);
  });

  it('accepts a correct signature in the Svix "v1,<sig>" list format', () => {
    const signature = `v1,${sign(verifierToken)}`;
    expect(
      HelcimDonationProcessor.verifyWebhook(
        { 'webhook-id': id, 'webhook-timestamp': timestamp, 'webhook-signature': signature },
        rawBody,
        verifierToken,
      ),
    ).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const signature = sign(verifierToken);
    const tampered = signature.slice(0, -2) + (signature.endsWith('AA') ? 'BB' : 'AA');
    expect(
      HelcimDonationProcessor.verifyWebhook(
        { 'webhook-id': id, 'webhook-timestamp': timestamp, 'webhook-signature': tampered },
        rawBody,
        verifierToken,
      ),
    ).toBe(false);
  });

  it('rejects a signature computed with the wrong verifier key', () => {
    const wrong = sign(Buffer.from('the-wrong-key').toString('base64'));
    expect(
      HelcimDonationProcessor.verifyWebhook(
        { 'webhook-id': id, 'webhook-timestamp': timestamp, 'webhook-signature': wrong },
        rawBody,
        verifierToken,
      ),
    ).toBe(false);
  });

  it('rejects when required headers are missing', () => {
    expect(
      HelcimDonationProcessor.verifyWebhook(
        { 'webhook-id': '', 'webhook-timestamp': timestamp, 'webhook-signature': sign(verifierToken) },
        rawBody,
        verifierToken,
      ),
    ).toBe(false);
  });
});
