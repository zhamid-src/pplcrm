import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityController } from './controller';
import { ExportsRepo } from '../exports/repositories/exports.repo';

vi.mock('../../lib/mail/transactional-mail.service', () => ({
  TransactionalEmailService: class {
    sendMail = vi.fn().mockResolvedValue(undefined);
  },
}));

describe('ActivityController', () => {
  let controller: ActivityController;

  beforeEach(() => {
    controller = new ActivityController();
    vi.restoreAllMocks();
  });

  it('should call getFeed and retrieve logs from repository', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const options = { startRow: 0, endRow: 25 };
    const mockFeedResult = {
      rows: [{ id: '1', activity: 'create', entity: 'person', first_name: 'Zee', last_name: '' }],
      count: 1,
    };

    const spy = vi.spyOn((controller as any).repo, 'getAllWithUser').mockResolvedValue(mockFeedResult as any);

    const result = await controller.getFeed(auth, options);

    expect(spy).toHaveBeenCalledWith('tenant-1', options);
    expect(result).toEqual(mockFeedResult);
  });

  it('should delete old activities based on subscription tier', async () => {
    const mockTenants = [
      { id: '1', subscription_plan: 'free' },
      { id: '2', subscription_plan: 'grassroots' },
    ];

    const selectMock = {
      select: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(mockTenants),
    };

    const deleteMock = {
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined),
    };

    const dbSpySelect = vi.spyOn((controller as any).repo.db, 'selectFrom').mockReturnValue(selectMock as any);
    const dbSpyDelete = vi.spyOn((controller as any).repo.db, 'deleteFrom').mockReturnValue(deleteMock as any);

    await controller.deleteOldActivities();

    expect(dbSpySelect).toHaveBeenCalledWith('tenants');
    expect(dbSpyDelete).toHaveBeenCalledWith('user_activity');
    expect(deleteMock.where).toHaveBeenCalledTimes(4); // 2 where conditions (tenant_id, created_at) * 2 tenants
  });

  it('should queue activity export as a background job and return processing status', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1', name: 'Zee' } as any;
    const input = {
      tenant_id: 'tenant-1',
      options: { userId: 'user-1' },
    };

    const mockExportRecord = { id: 'export-123', created_at: new Date(), updated_at: new Date() };
    const spyCreate = vi.spyOn(ExportsRepo.prototype, 'create').mockResolvedValue(mockExportRecord as any);

    const mockExecute = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({ execute: mockExecute });
    const spyInsertInto = vi.spyOn((controller as any).repo.db, 'insertInto').mockReturnValue({
      values: mockValues,
    } as any);

    const result = await controller.exportCsv(input, auth);

    expect(spyCreate).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      entity: 'user_activity',
      file_name: expect.any(String),
      columns: expect.any(Array),
    });

    expect(spyInsertInto).toHaveBeenCalledWith('background_jobs');
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: 'tenant-1',
        queue: 'default',
        status: 'pending',
        payload: expect.any(String),
      }),
    );

    expect(result).toEqual({ status: 'processing' });
  });
});
