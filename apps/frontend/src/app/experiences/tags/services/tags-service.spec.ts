import { vi } from 'vitest';
import { TagsService } from './tags-service';

describe('TagsService', () => {
  let service: TagsService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      tags: {
        add: { mutate: vi.fn() },
        count: { query: vi.fn() },
        delete: { mutate: vi.fn() },
        deleteMany: { mutate: vi.fn() },
        findByName: { query: vi.fn() },
        getAllWithCounts: { query: vi.fn() },
        getById: { query: vi.fn() },
        update: { mutate: vi.fn() },
        exportCsv: { mutate: vi.fn() },
      },
    };

    // Create a bare instance without invoking Angular inject()s
    service = Object.create(TagsService.prototype) as TagsService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
    (service as any).endpointName = 'tags';
    (service as any).refreshCount = { update: vi.fn() };
  });

  describe('add / attachTag', () => {
    it('adds a tag via the api', async () => {
      mockApi.tags.add.mutate.mockResolvedValue({ id: '1', name: 'donor' });

      const result = await service.add({ name: 'donor' });

      expect(mockApi.tags.add.mutate).toHaveBeenCalledWith({ name: 'donor' });
      expect(result).toEqual({ id: '1', name: 'donor' });
    });

    it('attachTag delegates to add with just the name', async () => {
      mockApi.tags.add.mutate.mockResolvedValue({ id: '2', name: 'vip' });

      await service.attachTag('unused-id', 'vip');

      expect(mockApi.tags.add.mutate).toHaveBeenCalledWith({ name: 'vip' });
    });
  });

  describe('delete / deleteMany', () => {
    it('triggers a refresh after a successful delete', async () => {
      mockApi.tags.delete.mutate.mockResolvedValue(true);

      const result = await service.delete('1');

      expect(mockApi.tags.delete.mutate).toHaveBeenCalledWith('1');
      expect(result).toBe(true);
      expect((service as any).refreshCount.update).toHaveBeenCalled();
    });

    it('triggers a refresh after deleting many', async () => {
      mockApi.tags.deleteMany.mutate.mockResolvedValue(true);

      const result = await service.deleteMany(['1', '2']);

      expect(result).toBe(true);
      expect((service as any).refreshCount.update).toHaveBeenCalled();
    });

    it('detachTag delegates to delete', async () => {
      mockApi.tags.delete.mutate.mockResolvedValue(true);

      const result = await service.detachTag('7');

      expect(mockApi.tags.delete.mutate).toHaveBeenCalledWith('7');
      expect(result).toBe(true);
    });
  });

  describe('filter', () => {
    it('returns only the named tags found by findByName', async () => {
      mockApi.tags.findByName.query.mockResolvedValue([{ name: 'donor' }, { name: '' }, { name: 'vip' }]);

      const result = await service.filter('vi');

      expect(mockApi.tags.findByName.query).toHaveBeenCalledWith({ name: 'vi', type: 'tag' });
      expect(result).toEqual(['donor', 'vip']);
    });

    it('returns an empty array when findByName resolves falsy', async () => {
      mockApi.tags.findByName.query.mockResolvedValue(null);

      const result = await service.filter('vi');

      expect(result).toEqual([]);
    });
  });

  describe('getAll / getAllArchived', () => {
    it('getAll delegates to getAllWithCounts', async () => {
      const payload = { rows: [{ id: '1' }], count: 1 };
      mockApi.tags.getAllWithCounts.query.mockResolvedValue(payload);

      const result = await service.getAll();

      expect(result).toEqual(payload);
    });

    it('getAllArchived always resolves with an empty result (archives unsupported)', async () => {
      const result = await service.getAllArchived();

      expect(result).toEqual({ rows: [], count: 0 });
      expect(mockApi.tags.getAllWithCounts.query).not.toHaveBeenCalled();
    });
  });

  describe('getTags', () => {
    it('wraps the single tag name found by id in an array', async () => {
      mockApi.tags.getById.query.mockResolvedValue({ id: '1', name: 'donor' });

      const result = await service.getTags('1');

      expect(mockApi.tags.getById.query).toHaveBeenCalledWith('1');
      expect(result).toEqual(['donor']);
    });
  });

  describe('update', () => {
    it('updates a tag and triggers a refresh', async () => {
      mockApi.tags.update.mutate.mockResolvedValue({ id: '1', name: 'renamed' });

      const result = await service.update('1', { name: 'renamed' });

      expect(mockApi.tags.update.mutate).toHaveBeenCalledWith({ id: '1', data: { name: 'renamed' } });
      expect(result).toEqual({ id: '1', name: 'renamed' });
      expect((service as any).refreshCount.update).toHaveBeenCalled();
    });
  });

  describe('exportCsv', () => {
    it('delegates to the api exportCsv mutation', async () => {
      const input = { columns: ['name'] } as any;
      const response = { url: 'https://example.com/export.csv' } as any;
      mockApi.tags.exportCsv.mutate.mockResolvedValue(response);

      const result = await service.exportCsv(input);

      expect(mockApi.tags.exportCsv.mutate).toHaveBeenCalledWith(input);
      expect(result).toEqual(response);
    });
  });
});
