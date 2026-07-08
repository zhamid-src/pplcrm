import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      activity: {
        getFeed: { query: vi.fn() },
        getActivities: { query: vi.fn() },
        exportCsv: { mutate: vi.fn() },
      },
    };

    service = Object.create(ActivityService.prototype) as ActivityService;
    (service as any).api = mockApi;
  });

  it('should query the global activity feed with the given options', async () => {
    const feed = { rows: [{ id: 'a1' }], totalCount: 1 };
    mockApi.activity.getFeed.query.mockResolvedValue(feed);

    const result = await service.getFeed({ startRow: 0, endRow: 25 });

    expect(mockApi.activity.getFeed.query).toHaveBeenCalledWith({ startRow: 0, endRow: 25 });
    expect(result).toEqual(feed);
  });

  it('should query per-record activities scoped by entity and entity id', async () => {
    const activities = { rows: [{ id: 'a2', activity: 'update' }] };
    mockApi.activity.getActivities.query.mockResolvedValue(activities);

    const result = await service.getActivities('persons', 'p1', { startRow: 0, endRow: 10 });

    expect(mockApi.activity.getActivities.query).toHaveBeenCalledWith({
      entity: 'persons',
      entityId: 'p1',
      startRow: 0,
      endRow: 10,
    });
    expect(result).toEqual(activities);
  });

  it('should call getActivities without extra options when none are given', async () => {
    mockApi.activity.getActivities.query.mockResolvedValue({ rows: [] });

    await service.getActivities('households', 'h1');

    expect(mockApi.activity.getActivities.query).toHaveBeenCalledWith({ entity: 'households', entityId: 'h1' });
  });

  it('should export the activity feed as CSV via the mutation endpoint', async () => {
    const exportResult = { csv: 'a,b\n1,2', columns: ['a', 'b'], fileName: 'export.csv', rowCount: 1 };
    mockApi.activity.exportCsv.mutate.mockResolvedValue(exportResult);

    const result = await service.exportCsv({ options: { userId: 'u1' }, fileName: 'export.csv' });

    expect(mockApi.activity.exportCsv.mutate).toHaveBeenCalledWith({
      options: { userId: 'u1' },
      fileName: 'export.csv',
    });
    expect(result).toEqual(exportResult);
  });

  it('should propagate errors from the feed query', async () => {
    mockApi.activity.getFeed.query.mockRejectedValue(new Error('network down'));

    await expect(service.getFeed()).rejects.toThrow('network down');
  });
});
