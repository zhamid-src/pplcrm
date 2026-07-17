import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { TRPCError } from '@trpc/server';
import { createSigner } from 'fast-jwt';
import { env } from '../../../env';
import { HouseholdsController } from '../households/controller';
import { sql } from 'kysely';

async function createTestSeed(db: any) {
  const rand = () => String(Math.floor(Math.random() * 100000000) + 1000000);
  const tenantId = rand();
  const userId = rand();

  await db
    .insertInto('tenants')
    .values({
      id: tenantId,
      name: 'Test Tenant Settings',
    })
    .execute();

  await db
    .insertInto('authusers')
    .values({
      id: userId,
      tenant_id: tenantId,
      email: `test-${userId}@example.com`,
      password: 'password',
      first_name: 'Test',
      last_name: 'User',
      verified: true,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  await db.updateTable('tenants').set({ admin_id: userId, createdby_id: userId }).where('id', '=', tenantId).execute();

  return { tenantId, userId };
}

async function cleanTenant(db: any, tenantId: string) {
  await db.updateTable('tenants').set({ admin_id: null, createdby_id: null }).where('id', '=', tenantId).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('SettingsController Integration', () => {
  const controller = new SettingsController();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  it('should block direct updates to communications.verified_emails', async () => {
    const auth = { tenant_id: tenantId, user_id: userId } as any;

    await expect(
      controller.upsert(auth, [{ key: 'communications.verified_emails', value: ['spam@example.com'] }]),
    ).rejects.toThrow(
      new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Verified emails list cannot be modified directly.',
      }),
    );
  });

  it('should block unverified emails from being used as default_from_email or reply_to', async () => {
    const auth = { tenant_id: tenantId, user_id: userId } as any;

    // Reject unverified default_from_email
    await expect(
      controller.upsert(auth, [{ key: 'communications.default_from_email', value: 'unverified@example.com' }]),
    ).rejects.toThrow(
      new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email address must be verified before it can be configured as a Default From Email.',
      }),
    );

    // Reject unverified reply_to
    await expect(
      controller.upsert(auth, [{ key: 'communications.reply_to', value: 'unverified@example.com' }]),
    ).rejects.toThrow(
      new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email address must be verified before it can be configured as a Reply-to Email.',
      }),
    );
  });

  it('should allow setting default_from_email or reply_to if email is verified', async () => {
    const auth = { tenant_id: tenantId, user_id: userId } as any;

    // 1. Pre-verify the email by adding it directly through the repo
    await controller.getRepo().upsertMany({
      tenant_id: tenantId,
      user_id: userId,
      entries: [{ key: 'communications.verified_emails', value: ['verified@example.com'] }],
    });

    // 2. Perform upsert of defaults
    const result = await controller.upsert(auth, [
      { key: 'communications.default_from_email', value: 'verified@example.com' },
      { key: 'communications.reply_to', value: 'verified@example.com' },
    ]);

    expect(result['communications.default_from_email']).toBe('verified@example.com');
    expect(result['communications.reply_to']).toBe('verified@example.com');
  });

  it('should enqueue a verification email on requestEmailVerification', async () => {
    const auth = { tenant_id: tenantId, user_id: userId } as any;

    const res = await controller.requestEmailVerification(auth, 'verify-me@example.com');
    expect(res.success).toBe(true);

    // Verify background job was enqueued
    const job = await db.selectFrom('background_jobs').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();

    expect(job).toBeDefined();
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    expect(payload.type).toBe('send-transactional-email');
    expect(payload.to).toBe('verify-me@example.com');
    expect(payload.subject).toContain('Verify your sender email address');
  });

  it('should enforce requestEmailVerification rate limit', async () => {
    const auth = { tenant_id: tenantId, user_id: userId } as any;

    // First request should pass
    await controller.requestEmailVerification(auth, 'ratelimit@example.com');

    // Second request within a minute should fail with TOO_MANY_REQUESTS
    await expect(controller.requestEmailVerification(auth, 'ratelimit@example.com')).rejects.toThrow(/Please wait/);
  });

  it('should enforce verifyVerifiedDomain rate limit', async () => {
    const auth = { tenant_id: tenantId, user_id: userId } as any;

    // Add the domain first
    await controller.addVerifiedDomain(auth, 'ratelimit.com');

    // First check should pass
    await controller.verifyVerifiedDomain(auth, 'ratelimit.com');

    // Second check within a minute should fail with TOO_MANY_REQUESTS
    await expect(controller.verifyVerifiedDomain(auth, 'ratelimit.com')).rejects.toThrow(/Please wait/);
  });

  it('should add the email to verified_emails upon verifySenderEmail', async () => {
    const key = process.env['SHARED_SECRET'] || env.sharedSecret;
    const signer = createSigner({
      algorithm: 'HS256',
      key,
      expiresIn: '24h',
    });

    const token = signer({
      tenant_id: tenantId,
      email: 'success@example.com',
      purpose: 'verify-sender-email',
    });

    const res = await controller.verifySenderEmail(token);
    expect(res.success).toBe(true);
    expect(res.email).toBe('success@example.com');

    // Retrieve settings
    const snapshot = await controller.getSnapshot({ tenant_id: tenantId } as any);
    expect(snapshot['communications.verified_emails']).toContain('success@example.com');
  });

  it('should add a pending domain entry on addVerifiedDomain', async () => {
    const auth = { tenant_id: tenantId, user_id: userId } as any;

    const list = await controller.addVerifiedDomain(auth, 'testorg.com');
    expect(list).toBeDefined();
    expect(list.length).toBe(1);

    const domainEntry = list[0];
    expect(domainEntry.domain).toBe('testorg.com');
    expect(domainEntry.status).toBe('pending');
    expect(domainEntry.spf).toBe(false);
    expect(domainEntry.dkim).toBe(false);
    expect(domainEntry.dmarc).toBe(false);
    expect(domainEntry.domainAuthId).toBeDefined();
    expect(domainEntry.linkBrandingId).toBeDefined();
    expect(domainEntry.domainAuthDns?.mail_cname?.host).toBe('em.testorg.com');
    expect(domainEntry.linkBrandingDns?.domain?.host).toBe('email.testorg.com');

    // Check settings snapshot
    const snapshot = await controller.getSnapshot(auth);
    const verifiedDomains = snapshot['communications.verified_domains'] as any[];
    expect(verifiedDomains).toBeDefined();
    expect(verifiedDomains.length).toBe(1);
    expect(verifiedDomains[0].domain).toBe('testorg.com');
  });

  it('should verify a domain successfully on verifyVerifiedDomain', async () => {
    const auth = { tenant_id: tenantId, user_id: userId } as any;

    // First add the domain
    await controller.addVerifiedDomain(auth, 'mytestdomain.com');

    // Perform verification (auto-passes only because ALLOW_MOCK_DOMAIN_VERIFICATION=true in .env.test)
    const list = await controller.verifyVerifiedDomain(auth, 'mytestdomain.com');
    expect(list).toBeDefined();

    const entry = list.find((d) => d.domain === 'mytestdomain.com');
    expect(entry).toBeDefined();
    expect(entry.status).toBe('verified');
    expect(entry.spf).toBe(true);
    expect(entry.dkim).toBe(true);
    expect(entry.dmarc).toBe(true);
    expect(entry.linkBranded).toBe(true);
  });

  it('should NOT auto-verify a domain without the explicit mock opt-in (fail closed)', async () => {
    const auth = { tenant_id: tenantId, user_id: userId } as any;

    await controller.addVerifiedDomain(auth, 'failclosed.example');

    // Simulate a deploy with no SendGrid key and no ALLOW_MOCK_DOMAIN_VERIFICATION: the
    // real DNS checks fail (the domain doesn't exist) and nothing may auto-pass.
    const original = env.allowMockDomainVerification;
    (env as { allowMockDomainVerification: boolean }).allowMockDomainVerification = false;
    try {
      const list = await controller.verifyVerifiedDomain(auth, 'failclosed.example');
      const entry = list.find((d) => d.domain === 'failclosed.example');
      expect(entry).toBeDefined();
      expect(entry.status).toBe('pending');
      expect(entry.spf).toBe(false);
      expect(entry.dkim).toBe(false);
      expect(entry.linkBranded).toBe(false);
    } finally {
      (env as { allowMockDomainVerification: boolean }).allowMockDomainVerification = original;
    }
  });

  it('should remove the domain from verified list on deleteVerifiedDomain', async () => {
    const auth = { tenant_id: tenantId, user_id: userId } as any;

    // Add domain
    await controller.addVerifiedDomain(auth, 'deleteme.com');

    // Delete it
    const list = await controller.deleteVerifiedDomain(auth, 'deleteme.com');
    expect(list.length).toBe(0);

    // Snapshot check
    const snapshot = await controller.getSnapshot(auth);
    const verifiedDomains = snapshot['communications.verified_domains'] as any[];
    expect(verifiedDomains.length).toBe(0);
  });

  it('should enforce recomputeAddressFingerprints rate limit of once a month', async () => {
    const householdsController = new HouseholdsController();

    // First recompute request should successfully queue a job
    await householdsController.recomputeAddressFingerprints(tenantId);

    // Verify a background job was created
    const job = await db
      .selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'recompute_address_fingerprints')
      .executeTakeFirst();

    expect(job).toBeDefined();

    // Second request should fail since one exists in the 30-day window
    await expect(householdsController.recomputeAddressFingerprints(tenantId)).rejects.toThrow(
      /Address fingerprints can only be recomputed once a month/,
    );
  });
});
