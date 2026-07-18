import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiPreflightVerdict } from '@common';
import { env } from '../../../env';
import { BaseRepository } from '../../lib/base.repo';
import { NewsletterPreflightService, contentHashOf } from './preflight.service';

const CLEAN_HTML =
  '<h1>October update</h1>' +
  '<p>Here is what our volunteers accomplished this month. We knocked on 1,200 doors and signed up ' +
  '85 new supporters across the ward. Thank you to everyone who gave a Saturday morning.</p>' +
  '<p><a href="https://vote-jane.example.org/volunteer">Join the next canvass</a></p>';

// Lint deductions alone (anchor/href mismatch + raw-IP link) push this below the blocked threshold.
const PHISHY_HTML =
  `<p>${'Body text so the message is not image-only. '.repeat(6)}</p>` +
  '<a href="https://evil.example.net/login">www.yourbank.com</a>' +
  '<a href="https://93.184.216.34/pay">Confirm your payment</a>';

describe('NewsletterPreflightService', () => {
  const service = new NewsletterPreflightService();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let savedApiKey: string | undefined;

  beforeEach(async () => {
    // Pin both network seams shut — no Anthropic or Postmark spamcheck calls from the suite.
    vi.spyOn(NewsletterPreflightService.prototype, 'aiReview').mockResolvedValue(null);
    vi.spyOn(NewsletterPreflightService.prototype, 'spamAssassinScore').mockResolvedValue(null);
    savedApiKey = env.anthropicApiKey;
    tenantId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db.insertInto('tenants').values({ id: tenantId, name: 'Preflight Test Tenant' }).execute();
  });

  afterEach(async () => {
    env.anthropicApiKey = savedApiKey;
    await db.deleteFrom('newsletter_content_checks').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
    vi.restoreAllMocks();
  });

  it('scores clean content 100/good, marks the AI layer unavailable, and caches the result', async () => {
    const result = await service.runPreflight(db, tenantId, { subject: 'October volunteer update', html: CLEAN_HTML });
    expect(result.score).toBe(100);
    expect(result.band).toBe('good');
    expect(result.findings).toEqual([]);
    expect(result.aiStatus).toBe('unavailable');

    const row = await db
      .selectFrom('newsletter_content_checks')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    expect(row?.band).toBe('good');
    expect(row?.content_hash).toBe(contentHashOf('October volunteer update', CLEAN_HTML, undefined));
    expect(row?.ai_model).toBeNull();
  });

  it('upserts on the content hash instead of accumulating rows', async () => {
    await service.runPreflight(db, tenantId, { subject: 'Update', html: CLEAN_HTML });
    await service.runPreflight(db, tenantId, { subject: 'Update', html: CLEAN_HTML });
    const rows = await db
      .selectFrom('newsletter_content_checks')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .execute();
    expect(rows).toHaveLength(1);
  });

  it('folds the AI verdict and SpamAssassin score into the findings and the score', async () => {
    const verdict: AiPreflightVerdict = {
      contentType: 'scam_or_phishing',
      spamRiskScore: 90,
      reasons: ['credential bait'],
      deceptionFlags: ['fake login prompt'],
      suggestions: ['Remove the password-entry link.'],
      confidence: 0.9,
    };
    vi.spyOn(NewsletterPreflightService.prototype, 'aiReview').mockResolvedValue(verdict);
    vi.spyOn(NewsletterPreflightService.prototype, 'spamAssassinScore').mockResolvedValue(6.5);

    const result = await service.runPreflight(db, tenantId, { subject: 'Verify your account', html: CLEAN_HTML });
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('ai-scam-phishing');
    expect(codes).toContain('spamassassin-score');
    expect(result.band).toBe('blocked');
    expect(result.aiStatus).toBe('reviewed');
    expect(result.spamAssassinScore).toBe(6.5);

    const row = await db
      .selectFrom('newsletter_content_checks')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    expect(row?.ai_model).toBe(env.anthropicModel);
  });

  it('assertNewsletterContentSendable blocks phishing-shaped content with no cache', async () => {
    await expect(
      service.assertNewsletterContentSendable(db, tenantId, {
        id: '4242',
        subject: 'Hello',
        html_content: PHISHY_HTML,
        plain_text_content: null,
      }),
    ).rejects.toThrow(/Deliverability score \d+ — fix the items flagged/);
  });

  it('assertNewsletterContentSendable honors a cached pass, backfills the id, and skips spamcheck', async () => {
    const spamcheckSpy = vi.spyOn(NewsletterPreflightService.prototype, 'spamAssassinScore');
    await db
      .insertInto('newsletter_content_checks')
      .values({
        tenant_id: tenantId,
        newsletter_id: null,
        content_hash: contentHashOf('Hello', PHISHY_HTML, null),
        score: 92,
        band: 'good',
        findings: JSON.stringify([]),
      })
      .execute();

    await service.assertNewsletterContentSendable(db, tenantId, {
      id: '4242',
      subject: 'Hello',
      html_content: PHISHY_HTML,
      plain_text_content: null,
    });

    const row = await db
      .selectFrom('newsletter_content_checks')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    expect(String(row?.newsletter_id)).toBe('4242');
    expect(spamcheckSpy).not.toHaveBeenCalled();
  });

  it('aiReview short-circuits to null (fail-open) when no API key is configured', async () => {
    vi.restoreAllMocks();
    env.anthropicApiKey = undefined;
    await expect(service.aiReview('Subject', 'Body', [])).resolves.toBeNull();
  });

  it('rate-limits interactive AI checks per tenant, but never the send-time gate', async () => {
    env.anthropicApiKey = 'test-key'; // aiReview itself stays mocked to null — no network
    const input = { subject: 'October volunteer update', html: CLEAN_HTML };

    for (let i = 0; i < 30; i++) {
      await service.runPreflight(db, tenantId, input);
    }
    await expect(service.runPreflight(db, tenantId, input)).rejects.toThrow(/too many|rate|retry/i);

    // The send gate runs with rateLimitAi=false — an exhausted interactive budget must never
    // block an actual send (only the score can do that).
    await expect(
      service.assertNewsletterContentSendable(db, tenantId, {
        id: '9999',
        subject: 'A different subject',
        html_content: CLEAN_HTML,
        plain_text_content: null,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('NewsletterPreflightService send-gate AI policy', () => {
  const service = new NewsletterPreflightService();
  const db = (BaseRepository as any)._db;
  const rand = () => String(Math.floor(Math.random() * 100000000) + 10000000);
  let tenantId: string;
  let userId: string;
  let campaignId: string;

  // Every send-time check includes the AI review — deliberately even for long-established paid
  // tenants, because compromised accounts (the pre-send threat the AI uniquely catches) get more
  // dangerous with tenure and list size, not less. This seed builds the "most trusted" tenant
  // shape so a regression back to risk-scoped gating fails here.
  async function seedTenant(plan: string | null, sentNewsletters: number): Promise<void> {
    await db
      .insertInto('tenants')
      .values({ id: tenantId, name: 'Preflight Gate Tenant', ...(plan ? { subscription_plan: plan } : {}) })
      .execute();
    await db
      .insertInto('authusers')
      .values({
        id: userId,
        tenant_id: tenantId,
        email: `preflight-${userId}@example.com`,
        password: 'password',
        first_name: 'Test',
        last_name: 'User',
        verified: true,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();
    await db
      .insertInto('campaigns')
      .values({
        id: campaignId,
        tenant_id: tenantId,
        admin_id: userId,
        name: 'Gate Campaign',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();
    for (let i = 0; i < sentNewsletters; i++) {
      await db
        .insertInto('newsletters')
        .values({
          id: rand(),
          tenant_id: tenantId,
          campaign_id: campaignId,
          name: `Sent newsletter ${i + 1}`,
          status: 'sent',
          segments: JSON.stringify([]),
          subject: 'Past update',
          html_content: '<p>Past</p>',
          createdby_id: userId,
          updatedby_id: userId,
        })
        .execute();
    }
  }

  function gateOn(newsletterId: string) {
    return service.assertNewsletterContentSendable(db, tenantId, {
      id: newsletterId,
      subject: 'October volunteer update',
      html_content: CLEAN_HTML,
      plain_text_content: null,
    });
  }

  beforeEach(() => {
    vi.spyOn(NewsletterPreflightService.prototype, 'aiReview').mockResolvedValue(null);
    vi.spyOn(NewsletterPreflightService.prototype, 'spamAssassinScore').mockResolvedValue(null);
    tenantId = rand();
    userId = rand();
    campaignId = rand();
  });

  afterEach(async () => {
    await db.deleteFrom('newsletter_content_checks').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('newsletters').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
    vi.restoreAllMocks();
  });

  it('runs the AI review at the gate even for an established paid tenant (every send is checked)', async () => {
    await seedTenant('movement', 3);
    const aiSpy = vi.spyOn(NewsletterPreflightService.prototype, 'aiReview');
    await expect(gateOn('7001')).resolves.toBeUndefined();
    expect(aiSpy).toHaveBeenCalledTimes(1);
  });
});
