import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExportsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { StorageService } from '../../lib/storage.service';
import { BackgroundJobWorker } from '../../lib/jobs/worker';

vi.mock('../../lib/storage.service', () => {
  return {
    TransactionalEmailService: class {
      sendMail = vi.fn().mockResolvedValue(undefined);
    },
    StorageService: class {
      delete = vi.fn().mockResolvedValue(undefined);
      upload = vi.fn().mockResolvedValue(undefined);
      uploadStream = vi.fn().mockResolvedValue(undefined);
      download = vi.fn().mockResolvedValue(undefined);
    },
  };
});

describe('ExportsController & Recovery', () => {
  const controller = new ExportsController();
  const db = (BaseRepository as any)._db;
  const rand = () => String(Math.floor(Math.random() * 100000000) + 10000000);
  let tenantId: string;
  let userId: string;

  beforeEach(async () => {
    tenantId = rand();
    userId = rand();

    await db
      .insertInto('tenants')
      .values({
        id: tenantId,
        name: 'Exports Test Tenant',
      })
      .execute();

    await db
      .insertInto('authusers')
      .values({
        id: userId,
        tenant_id: tenantId,
        email: `user-${userId}@example.com`,
        password: 'password',
        first_name: 'Test',
        last_name: 'User',
        verified: true,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();
  });

  afterEach(async () => {
    // Clean up
    await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('data_exports').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
  });

  it('should queue and delete exports correctly', async () => {
    const auth = { tenant_id: tenantId, user_id: userId, name: 'Test User' } as any;

    // Queue export
    const queueRes = await controller.queueExport(
      {
        entity: 'persons',
        options: {},
      },
      auth,
    );

    expect(queueRes.id).toBeDefined();

    // Check data_exports has been created
    const record = await controller.getById(queueRes.id, auth);
    expect(record).toBeDefined();
    expect(record.status).toBe('pending');

    // Check background job has been queued
    const job = await db.selectFrom('background_jobs').selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();
    expect(job).toBeDefined();

    // Delete export
    const delRes = await controller.deleteExport(queueRes.id, auth);
    expect(delRes.success).toBe(true);

    // Verify record is deleted
    await expect(controller.getById(queueRes.id, auth)).rejects.toThrow();

    // Verify background job is deleted
    const jobAfterDelete = await db
      .selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    expect(jobAfterDelete).toBeUndefined();
  });
});
