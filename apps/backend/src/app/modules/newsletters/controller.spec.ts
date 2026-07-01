import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NewslettersController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { executeJob } from '../../lib/jobs/job-handlers';
import { NewsletterEmailService } from '../../lib/mail/newsletter-mail.service';

async function createTestSeed(db: any) {
  const rand = () => String(Math.floor(Math.random() * 100000000) + 10000000);
  const tenantId = rand();
  const userId = rand();
  const campaignId = rand();
  const householdId = rand();

  // 1. Tenant
  await db
    .insertInto('tenants')
    .values({
      id: tenantId,
      name: 'Test Tenant',
    })
    .execute();

  // 2. User
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

  // 3. Campaign
  await db
    .insertInto('campaigns')
    .values({
      id: campaignId,
      tenant_id: tenantId,
      admin_id: userId,
      name: 'Test Campaign',
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  // 4. Household
  await db
    .insertInto('households')
    .values({
      id: householdId,
      tenant_id: tenantId,
      campaign_id: campaignId,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  // Update tenant
  await db
    .updateTable('tenants')
    .set({
      admin_id: userId,
      createdby_id: userId,
      placeholder_household_id: householdId,
    })
    .where('id', '=', tenantId)
    .execute();

  return { tenantId, userId, campaignId, householdId };
}

async function cleanTenant(db: any, tenantId: string) {
  await db
    .updateTable('tenants')
    .set({ admin_id: null, createdby_id: null, placeholder_household_id: null })
    .where('id', '=', tenantId)
    .execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_lists_persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('newsletters').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('NewslettersController Asynchronous Sending', () => {
  const controller = new NewslettersController();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let campaignId: string;
  let householdId: string;
  let tagId: string;
  let personId: string;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    campaignId = seed.campaignId;
    householdId = seed.householdId;

    // Create a person
    personId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('persons')
      .values({
        id: personId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Create Tag
    tagId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('tags')
      .values({
        id: tagId,
        tenant_id: tenantId,
        name: 'NewsletterTag',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Map Person to Tag
    await db
      .insertInto('map_peoples_tags')
      .values({
        tenant_id: tenantId,
        person_id: personId,
        tag_id: tagId,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
    vi.restoreAllMocks();
  });

  it('should throw BadRequestError if newsletter is already sent or queuing/sending', async () => {
    const id = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('newsletters')
      .values({
        id,
        tenant_id: tenantId,
        name: 'Already Sent Newsletter',
        status: 'sent',
        segments: JSON.stringify(['NewsletterTag']),
        subject: 'Hello',
        html_content: '<p>Hi</p>',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    await expect(controller.sendNewsletter(tenantId, id, userId)).rejects.toThrow(
      'Newsletter has already been sent or is currently sending',
    );
  });

  it('should throw BadRequestError if no recipients are resolved', async () => {
    const id = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('newsletters')
      .values({
        id,
        tenant_id: tenantId,
        name: 'No Recipients Newsletter',
        status: 'draft',
        segments: JSON.stringify(['NonExistentTag']),
        subject: 'Hello',
        html_content: '<p>Hi</p>',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    await expect(controller.sendNewsletter(tenantId, id, userId)).rejects.toThrow(
      'No recipients found for the selected lists or tags',
    );
  });

  it('should enqueue a background job and set status to queuing', async () => {
    const id = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('newsletters')
      .values({
        id,
        tenant_id: tenantId,
        name: 'Valid Newsletter',
        status: 'draft',
        segments: JSON.stringify(['NewsletterTag']),
        subject: 'Hello',
        html_content: '<p>Hi</p>',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    const result = await controller.sendNewsletter(tenantId, id, userId);
    expect(result.status).toBe('queuing');
    expect(result.total_recipients).toBe(1);

    // Verify background job is enqueued
    const job = await db.selectFrom('background_jobs').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();

    expect(job).toBeDefined();
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    expect(payload.type).toBe('send-newsletter');
    expect(payload.newsletterId).toBe(id);
    expect(payload.offset).toBe(0);
    expect(payload.deliveredCount).toBe(0);
  });

  it('should process newsletter sending, support batching, and update status/activity', async () => {
    const id = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('newsletters')
      .values({
        id,
        tenant_id: tenantId,
        name: 'Send Worker Newsletter',
        status: 'queuing',
        segments: JSON.stringify(['NewsletterTag']),
        subject: 'Hello',
        html_content: '<p>Hi</p>',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Create a mock job entry
    const jobId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('background_jobs')
      .values({
        id: jobId,
        tenant_id: tenantId,
        queue: 'default',
        status: 'processing',
        payload: JSON.stringify({
          type: 'send-newsletter',
          newsletterId: id,
          tenantId: tenantId,
          userId: userId,
          offset: 0,
          deliveredCount: 0,
        }),
        attempts: 1,
        max_attempts: 3,
        run_at: new Date(),
      })
      .execute();

    const spy = vi.spyOn(NewsletterEmailService.prototype, 'sendNewsletter').mockResolvedValue(1);

    const job = await db.selectFrom('background_jobs').selectAll().where('id', '=', jobId).executeTakeFirst();
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

    await executeJob(payload, db, jobId);

    expect(spy).toHaveBeenCalledTimes(1);

    // Verify newsletter is updated to 'sent'
    const newsletter = await db.selectFrom('newsletters').selectAll().where('id', '=', id).executeTakeFirst();
    expect(newsletter.status).toBe('sent');
    expect(Number(newsletter.delivered_count)).toBe(1);
    expect(newsletter.send_date).not.toBeNull();

    // Verify user activity is logged
    const activity = await db
      .selectFrom('user_activity')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('entity_id', '=', id)
      .executeTakeFirst();
    expect(activity).toBeDefined();
    expect(activity.activity).toBe('send');
    expect(Number(activity.quantity)).toBe(1);
  });

  it('should process all recipients and set status to sent', async () => {
    // Add another person to make it 2 recipients
    const personId2 = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('persons')
      .values({
        id: personId2,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Bob',
        last_name: 'Jones',
        email: 'bob@example.com',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Map second person to Tag
    await db
      .insertInto('map_peoples_tags')
      .values({
        tenant_id: tenantId,
        person_id: personId2,
        tag_id: tagId,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    const id = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('newsletters')
      .values({
        id,
        tenant_id: tenantId,
        name: 'Multiple Recipients Newsletter',
        status: 'queuing',
        segments: JSON.stringify(['NewsletterTag']),
        subject: 'Hello',
        html_content: '<p>Hi</p>',
        total_recipients: 2,
        delivered_count: 0,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    const jobId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('background_jobs')
      .values({
        id: jobId,
        tenant_id: tenantId,
        queue: 'default',
        status: 'processing',
        payload: JSON.stringify({
          type: 'send-newsletter',
          newsletterId: id,
          tenantId: tenantId,
          userId: userId,
          offset: 0,
          deliveredCount: 0,
        }),
        attempts: 1,
        max_attempts: 3,
        run_at: new Date(),
      })
      .execute();

    const _spy = vi.spyOn(NewsletterEmailService.prototype, 'sendNewsletter').mockResolvedValue(2);

    const job = await db.selectFrom('background_jobs').selectAll().where('id', '=', jobId).executeTakeFirst();
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    await executeJob(payload, db, jobId);

    // Verify newsletter is now fully 'sent'
    const newsletter = await db.selectFrom('newsletters').selectAll().where('id', '=', id).executeTakeFirst();
    expect(newsletter.status).toBe('sent');
    expect(Number(newsletter.delivered_count)).toBe(2);
  });
});
