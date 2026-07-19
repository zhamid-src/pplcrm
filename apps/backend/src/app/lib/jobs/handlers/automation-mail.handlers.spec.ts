import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../env', () => ({
  env: { apiUrl: 'https://api.test', sharedSecret: 'test-secret', sendgridFreeTierSubuser: '', sendgridApiKey: '' },
}));

import { NewsletterEmailService } from '../../mail/newsletter-mail.service';
import { buildAutomationFooter, handleSendAutomationEmail } from './automation-mail.handlers';

describe('buildAutomationFooter', () => {
  const url = 'https://api.test/api/unsubscribe/tok';

  it('always carries the unsubscribe link, in both parts', () => {
    const footer = buildAutomationFooter(url);
    expect(footer.html).toContain(`href="${url}"`);
    expect(footer.text).toContain(`Unsubscribe: ${url}`);
  });

  it('includes the org address and disclaimer when present, escaped', () => {
    const footer = buildAutomationFooter(url, '12 Main St\nOttawa', 'Paid for by <The Committee>');
    expect(footer.html).toContain('12 Main St<br>Ottawa');
    expect(footer.html).toContain('Paid for by &lt;The Committee&gt;');
    expect(footer.text).toContain('12 Main St');
    expect(footer.text).toContain('Paid for by <The Committee>');
  });

  it('omits empty address/disclaimer blocks entirely', () => {
    const footer = buildAutomationFooter(url, '  ', '');
    expect(footer.html).not.toContain('<br>');
    expect(footer.text.trim().split('\n').filter(Boolean)).toHaveLength(2); // divider + unsubscribe
  });
});

/** Minimal Kysely stand-in: canned rows per table, with newsletter_send_log inserts recorded. */
function makeFakeDb(data: Record<string, unknown>) {
  const inserts: { table: string; values: Record<string, unknown> }[] = [];
  const rowsFor = (table: string): unknown[] => {
    const v = data[table];
    if (v === undefined) return [];
    return Array.isArray(v) ? v : [v];
  };
  const makeBuilder = (table: string): Record<string, unknown> => {
    const b: Record<string, unknown> = {};
    const chain = (): Record<string, unknown> => b;
    for (const m of ['select', 'where', 'onConflict']) b[m] = vi.fn(chain);
    b['values'] = vi.fn((values: Record<string, unknown>): Record<string, unknown> => {
      inserts.push({ table, values });
      return b;
    });
    b['execute'] = vi.fn(async () => rowsFor(table));
    b['executeTakeFirst'] = vi.fn(async () => rowsFor(table)[0]);
    return b;
  };
  const db = {
    selectFrom: vi.fn((t: string) => makeBuilder(String(t))),
    insertInto: vi.fn((t: string) => makeBuilder(String(t))),
  };
  return { db, inserts };
}

describe('handleSendAutomationEmail quota metering', () => {
  afterEach(() => vi.restoreAllMocks());

  const TABLES = {
    settings: [{ key: 'communications.default_from_email', value: 'team@camp.org' }],
    tenants: {
      id: '42',
      subscription_plan: 'grassroots',
      subscription_quantity: 1,
      subscription_ends_at: null,
      subscription_status: 'active',
      created_at: null,
      suspended_at: null,
      sending_paused_at: null,
      sending_phone_verified_at: null,
    },
  };
  const PAYLOAD = {
    tenantId: '42',
    workflowRunId: 'r9',
    to: 'sup@example.org',
    subject: 'Thanks',
    html: '<p>Thank you!</p>',
    text: 'Thank you!',
    unsubscribeUrl: 'https://api.test/api/unsubscribe/tok',
  };

  it('meters the send into newsletter_send_log only after SendGrid accepts it', async () => {
    const sendSpy = vi.spyOn(NewsletterEmailService.prototype, 'sendNewsletter').mockResolvedValue(1);
    const { db, inserts } = makeFakeDb(TABLES);
    await handleSendAutomationEmail(db as any, { ...PAYLOAD, meterOnSend: true });
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const metered = inserts.filter((i) => i.table === 'newsletter_send_log');
    expect(metered).toHaveLength(1);
    expect(metered[0].values['source']).toBe('automation');
    expect(metered[0].values['recipient_count']).toBe(1);
  });

  it('consumes no quota when the delivery fails', async () => {
    vi.spyOn(NewsletterEmailService.prototype, 'sendNewsletter').mockRejectedValue(new Error('sendgrid 500'));
    const { db, inserts } = makeFakeDb(TABLES);
    await expect(handleSendAutomationEmail(db as any, { ...PAYLOAD, meterOnSend: true })).rejects.toThrow(
      'sendgrid 500',
    );
    expect(inserts.filter((i) => i.table === 'newsletter_send_log')).toHaveLength(0);
  });

  it('does not double-count legacy jobs that were metered at enqueue time', async () => {
    vi.spyOn(NewsletterEmailService.prototype, 'sendNewsletter').mockResolvedValue(1);
    const { db, inserts } = makeFakeDb(TABLES);
    await handleSendAutomationEmail(db as any, PAYLOAD);
    expect(inserts.filter((i) => i.table === 'newsletter_send_log')).toHaveLength(0);
  });
});
