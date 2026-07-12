import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseRepository } from '../../base.repo';
import { buildNewsletterAttachments } from './newsletter.handlers';

vi.mock('../../storage.service', () => {
  class StorageService {
    public async download(): Promise<Buffer> {
      return Buffer.from('fake-file-bytes');
    }
  }
  return { StorageService };
});

const rand = (): string => String(Math.floor(Math.random() * 100000000) + 10000000);

describe('buildNewsletterAttachments', () => {
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let campaignId: string;
  let newsletterId: string;

  beforeEach(async () => {
    tenantId = rand();
    userId = rand();
    campaignId = rand();
    newsletterId = rand();

    await db
      .insertInto('tenants')
      .values({ id: tenantId, name: 'Attachment Test Tenant', subscription_plan: 'free' })
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
    await db
      .insertInto('campaigns')
      .values({
        id: campaignId,
        tenant_id: tenantId,
        admin_id: userId,
        name: 'Office',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();
    await db
      .insertInto('newsletters')
      .values({
        id: newsletterId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        name: 'Spring gala follow-up',
        subject: 'Spring gala follow-up',
        status: 'draft',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();
  });

  afterEach(async () => {
    await db.deleteFrom('files').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('newsletters').where('id', '=', newsletterId).execute();
    await db.deleteFrom('campaigns').where('id', '=', campaignId).execute();
    await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
  });

  it('returns undefined when no files are attached', async () => {
    const attachments = await buildNewsletterAttachments(db, tenantId, newsletterId);
    expect(attachments).toBeUndefined();
  });

  it('downloads and base64-encodes files attached to the newsletter', async () => {
    await db
      .insertInto('files')
      .values({
        tenant_id: tenantId,
        filename: 'flyer.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        storage_key: `uploads/${tenantId}/flyer.pdf`,
        entity_type: 'newsletter',
        entity_id: newsletterId,
      })
      .execute();

    const attachments = await buildNewsletterAttachments(db, tenantId, newsletterId);

    expect(attachments).toHaveLength(1);
    expect(attachments?.[0]).toMatchObject({ filename: 'flyer.pdf', type: 'application/pdf' });
    expect(attachments?.[0]?.content).toBe(Buffer.from('fake-file-bytes').toString('base64'));
  });

  it('skips attachments when the tenant is at or over its storage quota', async () => {
    const { getPlanLimits } = await import('../../../modules/billing/usage-limits');
    const quota = getPlanLimits('free').storageBytes;

    await db
      .insertInto('files')
      .values({
        tenant_id: tenantId,
        filename: 'flyer.pdf',
        mime_type: 'application/pdf',
        size_bytes: quota,
        storage_key: `uploads/${tenantId}/flyer.pdf`,
        entity_type: 'newsletter',
        entity_id: newsletterId,
      })
      .execute();

    const attachments = await buildNewsletterAttachments(db, tenantId, newsletterId);
    expect(attachments).toBeUndefined();
  });

  it('ignores files not linked to this newsletter', async () => {
    await db
      .insertInto('files')
      .values({
        tenant_id: tenantId,
        filename: 'unrelated.pdf',
        storage_key: `uploads/${tenantId}/unrelated.pdf`,
      })
      .execute();

    const attachments = await buildNewsletterAttachments(db, tenantId, newsletterId);
    expect(attachments).toBeUndefined();
  });
});
