import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { TRPCError } from '@trpc/server';
import { createSigner } from 'fast-jwt';
import { env } from '../../../env';

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
    ).rejects.toThrowError(
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
    ).rejects.toThrowError(
      new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email address must be verified before it can be configured as a Default From Email.',
      }),
    );

    // Reject unverified reply_to
    await expect(
      controller.upsert(auth, [{ key: 'communications.reply_to', value: 'unverified@example.com' }]),
    ).rejects.toThrowError(
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
    expect(payload.subject).toContain('Verify sender email');
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
});
