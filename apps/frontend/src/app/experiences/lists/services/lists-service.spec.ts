import { vi } from 'vitest';
import { ListsService } from './lists-service';

describe('ListsService', () => {
  let service: ListsService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      lists: {
        add: { mutate: vi.fn() },
        count: { query: vi.fn() },
        getAllWithCounts: { query: vi.fn() },
        getById: { query: vi.fn() },
        getMembersHouseholds: { query: vi.fn() },
        getMembersPersons: { query: vi.fn() },
        update: { mutate: vi.fn() },
        refresh: { mutate: vi.fn() },
        getListStats: { query: vi.fn() },
        getMemberCount: { query: vi.fn() },
        exportCsv: { mutate: vi.fn() },
      },
    };

    // Create a bare instance without invoking Angular inject()s
    service = Object.create(ListsService.prototype) as ListsService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
    // No active context in unit tests (§15): reads go unscoped, writes unstamped.
    (service as any).campaignContext = { activeCampaignId: () => null };
    (service as any).endpointName = 'lists';
  });

  describe('add', () => {
    it('opts out of the global error handler and forwards the payload', async () => {
      const created = { id: '1', name: 'Big Donors' };
      mockApi.lists.add.mutate.mockResolvedValue(created);

      const result = await service.add({ name: 'Big Donors' } as any);

      expect(mockApi.lists.add.mutate).toHaveBeenCalledWith(
        { name: 'Big Donors' },
        { context: { skipErrorHandler: true } },
      );
      expect(result).toEqual(created);
    });
  });

  describe('tag support', () => {
    it('attachTag is a no-op that resolves', async () => {
      await expect(service.attachTag('1', 'donor')).resolves.toBeUndefined();
    });

    it('detachTag is a no-op that resolves to false', async () => {
      await expect(service.detachTag('1', 'donor')).resolves.toBe(false);
    });

    it('getTags always resolves to an empty array', async () => {
      await expect(service.getTags('1')).resolves.toEqual([]);
    });
  });

  describe('getAll / getAllArchived', () => {
    it('getAll delegates to getAllWithCounts', async () => {
      const payload = { rows: [{ id: '1' }], count: 1 };
      mockApi.lists.getAllWithCounts.query.mockResolvedValue(payload);

      const result = await service.getAll();

      expect(result).toEqual(payload);
    });

    it('getAllArchived always resolves with an empty result (archives unsupported)', async () => {
      const result = await service.getAllArchived();

      expect(result).toEqual({ rows: [], count: 0 });
      expect(mockApi.lists.getAllWithCounts.query).not.toHaveBeenCalled();
    });
  });

  describe('membership lookups', () => {
    it('getMembersHouseholds queries by list id', async () => {
      const rows = [{ id: 'h1' }];
      mockApi.lists.getMembersHouseholds.query.mockResolvedValue(rows);

      const result = await service.getMembersHouseholds('list-1');

      expect(mockApi.lists.getMembersHouseholds.query).toHaveBeenCalledWith('list-1');
      expect(result).toEqual(rows);
    });

    it('getMembersPersons queries by list id', async () => {
      const rows = [{ id: 'p1' }];
      mockApi.lists.getMembersPersons.query.mockResolvedValue(rows);

      const result = await service.getMembersPersons('list-1');

      expect(mockApi.lists.getMembersPersons.query).toHaveBeenCalledWith('list-1');
      expect(result).toEqual(rows);
    });
  });

  describe('update / refreshList', () => {
    it('update forwards id and data to the api', async () => {
      mockApi.lists.update.mutate.mockResolvedValue({ id: '1', name: 'Renamed' });

      const result = await service.update('1', { name: 'Renamed' } as any);

      expect(mockApi.lists.update.mutate).toHaveBeenCalledWith({ id: '1', data: { name: 'Renamed' } });
      expect(result).toEqual({ id: '1', name: 'Renamed' });
    });

    it('refreshList delegates to the api refresh mutation', async () => {
      mockApi.lists.refresh.mutate.mockResolvedValue(true);

      const result = await service.refreshList('1');

      expect(mockApi.lists.refresh.mutate).toHaveBeenCalledWith('1');
      expect(result).toBe(true);
    });
  });

  describe('stats', () => {
    it('getListStats queries by id', async () => {
      const stats = { totalMembers: 10 };
      mockApi.lists.getListStats.query.mockResolvedValue(stats);

      const result = await service.getListStats('1');

      expect(mockApi.lists.getListStats.query).toHaveBeenCalledWith('1');
      expect(result).toEqual(stats);
    });

    it('getMemberCount queries by id', async () => {
      mockApi.lists.getMemberCount.query.mockResolvedValue(42);

      const result = await service.getMemberCount('1');

      expect(result).toBe(42);
    });
  });

  describe('exportCsv', () => {
    it('delegates to the api exportCsv mutation', async () => {
      const input = { columns: ['name'] } as any;
      const response = { url: 'https://example.com/export.csv' } as any;
      mockApi.lists.exportCsv.mutate.mockResolvedValue(response);

      const result = await service.exportCsv(input);

      expect(mockApi.lists.exportCsv.mutate).toHaveBeenCalledWith(input);
      expect(result).toEqual(response);
    });
  });
});
