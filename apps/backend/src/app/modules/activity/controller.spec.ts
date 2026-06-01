import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityController } from './controller';

vi.mock('../../lib/mail/transactional-mail.service', () => {
  return {
    TransactionalEmailService: class {
      sendMail = vi.fn().mockResolvedValue(undefined);
    },
  };
});

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
      rows: [
        { id: '1', activity: 'create', entity: 'person', first_name: 'Zee', last_name: '' }
      ],
      count: 1
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

  it('should export user activities correctly formatted as CSV', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1', name: 'Zee' } as any;
    const input = {
      tenant_id: 'tenant-1',
      options: { startRow: 0, endRow: 25 },
    };

    const mockFeedResult = {
      rows: [
        {
          id: '1',
          created_at: new Date('2026-06-01T12:00:00Z'),
          first_name: 'Zee',
          last_name: 'H',
          email: 'zee@example.com',
          activity: 'create',
          entity: 'person',
          entity_id: 'person-1',
          quantity: 1,
          metadata: { id: 'person-1' },
        },
      ],
      count: 1,
    };

    const spyGetAll = vi.spyOn((controller as any).repo, 'getAllWithUser').mockResolvedValue(mockFeedResult as any);
    const spyLog = vi.spyOn((controller as any).userActivity, 'log').mockResolvedValue(undefined);

    const userSelectMock = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn().mockResolvedValue({ email: 'zee@example.com' }),
    };
    vi.spyOn((controller as any).repo.db, 'selectFrom').mockReturnValue(userSelectMock as any);

    const result = await controller.exportCsv(input, auth);

    expect(spyGetAll).toHaveBeenCalled();
    expect(spyLog).toHaveBeenCalled();
    expect(result.rowCount).toBe(1);
    expect(result.csv).toContain('Zee H');
    expect(result.csv).toContain('zee@example.com');
    expect(result.csv).toContain('create');
  });
});
