import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotificationsRouter } from './trpc.router';
import { NotificationsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';

function mockAuthDb() {
  const mockQB: any = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue({ role: 'owner', verified: true }),
  };
  vi.spyOn(BaseRepository, 'dbInstance', 'get').mockReturnValue({
    selectFrom: vi.fn().mockReturnValue(mockQB),
  } as any);
}

describe('NotificationsRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthDb();
  });

  it('should call markAllAsRead on the controller and return undefined (no BigInt value)', async () => {
    const spy = vi.spyOn(NotificationsController.prototype, 'markAllAsRead').mockResolvedValue(undefined as any);

    const caller = NotificationsRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    const result = await caller.markAllRead();

    expect(spy).toHaveBeenCalled();
    expect(result).toBeUndefined();
    expect(typeof result).not.toBe('bigint');
  });

  it('should verify getUnreadCount resolves to a number, not a BigInt', async () => {
    const spy = vi.spyOn(NotificationsController.prototype, 'getUnreadCount').mockResolvedValue(5);

    const caller = NotificationsRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    const result = await caller.getUnreadCount();

    expect(spy).toHaveBeenCalled();
    expect(result).toBe(5);
    expect(typeof result).toBe('number');
    expect(typeof result).not.toBe('bigint');
  });
});
