import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsController } from './controller';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(() => {
    controller = new NotificationsController();
    vi.restoreAllMocks();
  });

  it('should call getLatestForUser with correct parameters', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const mockNotifs = [
      { id: '1', title: 'Test' }
    ];
    const spy = vi.spyOn((controller as any).repo, 'getLatestForUser').mockResolvedValue(mockNotifs as any);

    const result = await controller.getLatest(auth);

    expect(spy).toHaveBeenCalledWith('tenant-1', 'user-1', undefined, undefined);
    expect(result).toEqual(mockNotifs);
  });

  it('should forward limit and offset to getLatestForUser when provided', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const mockNotifs = [{ id: '1', title: 'Test' }];
    const spy = vi.spyOn((controller as any).repo, 'getLatestForUser').mockResolvedValue(mockNotifs as any);

    const result = await controller.getLatest(auth, 10, 5);

    expect(spy).toHaveBeenCalledWith('tenant-1', 'user-1', 10, 5);
    expect(result).toEqual(mockNotifs);
  });

  it('should call getUnreadCount with correct parameters', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const spy = vi.spyOn((controller as any).repo, 'getUnreadCount').mockResolvedValue(5);

    const result = await controller.getUnreadCount(auth);

    expect(spy).toHaveBeenCalledWith('tenant-1', 'user-1');
    expect(result).toBe(5);
  });

  it('should call markAllRead with correct parameters', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const spy = vi.spyOn((controller as any).repo, 'markAllRead').mockResolvedValue(null as any);

    await controller.markAllAsRead(auth);

    expect(spy).toHaveBeenCalledWith('tenant-1', 'user-1');
  });

  it('should update notification read status on markRead', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const spy = vi.spyOn(controller, 'update').mockResolvedValue({ id: '1', read: true } as any);

    const result = await controller.markRead('1', auth);

    expect(spy).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      id: '1',
      row: { read: true },
    });
    expect(result).toEqual({ id: '1', read: true });
  });
});
