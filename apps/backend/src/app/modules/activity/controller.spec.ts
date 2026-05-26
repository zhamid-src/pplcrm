import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityController } from './controller';

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
});
