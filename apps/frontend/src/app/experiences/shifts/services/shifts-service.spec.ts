import { signal } from '@angular/core';
import { vi } from 'vitest';
import { ShiftsService } from './shifts-service';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let mockApi: any;

  const mockShift = {
    id: '1',
    name: 'Weekend Canvass',
    slug: 'weekend-canvass',
    location_address: 'Central Park',
    start_time: '2026-08-01T09:00:00Z',
    end_time: '2026-08-01T12:00:00Z',
    capacity: 20,
  };

  beforeEach(() => {
    mockApi = {
      volunteer: {
        add: { mutate: vi.fn() },
        update: { mutate: vi.fn() },
        getAll: { query: vi.fn() },
        getById: { query: vi.fn() },
        delete: { mutate: vi.fn() },
        checkSlugUnique: { query: vi.fn() },
      },
    };

    service = Object.create(ShiftsService.prototype) as ShiftsService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
    (service as any).refreshCount = signal(0);
    (service as any).endpointName = 'volunteer';
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('CRUD operations', () => {
    it('should add a volunteer event', async () => {
      mockApi.volunteer.add.mutate.mockResolvedValue(mockShift);

      const result = await service.add({ name: 'Weekend Canvass' } as any);

      expect(mockApi.volunteer.add.mutate).toHaveBeenCalledWith({ name: 'Weekend Canvass' });
      expect(result).toEqual(mockShift);
    });

    it('should resolve addMany with an empty array', async () => {
      await expect(service.addMany([{ name: 'Weekend Canvass' } as any])).resolves.toEqual([]);
    });

    it('should get a volunteer event by id', async () => {
      mockApi.volunteer.getById.query.mockResolvedValue(mockShift);

      const result = await service.getById('1');

      expect(mockApi.volunteer.getById.query).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockShift);
    });

    it('should get all volunteer events scoped by the abort signal', async () => {
      const mockResult = { rows: [mockShift], count: 1 };
      mockApi.volunteer.getAll.query.mockResolvedValue(mockResult);

      const result = await service.getAll({ startRow: 0, endRow: 25 } as any);

      expect(mockApi.volunteer.getAll.query).toHaveBeenCalledWith(
        { startRow: 0, endRow: 25 },
        { signal: (service as any).ac.signal },
      );
      expect(result).toEqual(mockResult);
    });

    it('should get archived volunteer events by including includeArchived', async () => {
      mockApi.volunteer.getAll.query.mockResolvedValue({ rows: [], count: 0 });

      await service.getAllArchived({ startRow: 0, endRow: 25 } as any);

      expect(mockApi.volunteer.getAll.query).toHaveBeenCalledWith(
        { startRow: 0, endRow: 25, includeArchived: true },
        { signal: (service as any).ac.signal },
      );
    });

    it('should update a volunteer event', async () => {
      const updated = { ...mockShift, name: 'Weekend Canvass 2' };
      mockApi.volunteer.update.mutate.mockResolvedValue(updated);

      const result = await service.update('1', { name: 'Weekend Canvass 2' } as any);

      expect(mockApi.volunteer.update.mutate).toHaveBeenCalledWith({ id: '1', data: { name: 'Weekend Canvass 2' } });
      expect(result).toEqual(updated);
    });

    it('should delete a volunteer event via the inherited AbstractAPIService.delete', async () => {
      mockApi.volunteer.delete.mutate.mockResolvedValue(true);

      const result = await service.delete('1');

      expect(mockApi.volunteer.delete.mutate).toHaveBeenCalledWith('1');
      expect(result).toBe(true);
    });
  });

  describe('Slug checking', () => {
    it('should check slug uniqueness excluding the current event', async () => {
      mockApi.volunteer.checkSlugUnique.query.mockResolvedValue({ unique: false });

      const result = await service.checkSlugUnique('weekend-canvass', '1');

      expect(mockApi.volunteer.checkSlugUnique.query).toHaveBeenCalledWith({
        slug: 'weekend-canvass',
        excludeId: '1',
      });
      expect(result).toEqual({ unique: false });
    });
  });

  describe('Placeholder / unsupported endpoints', () => {
    it('should resolve count from the getAll count field', async () => {
      mockApi.volunteer.getAll.query.mockResolvedValue({ count: 4 });

      await expect(service.count()).resolves.toBe(4);
    });

    it('should resolve getTags with an empty array', async () => {
      await expect(service.getTags('1')).resolves.toEqual([]);
    });

    it('should reject exportCsv since volunteer export is not available', async () => {
      await expect(service.exportCsv({} as any)).rejects.toThrow('Volunteer export is not available');
    });
  });

  describe('Shared refresh signal', () => {
    it('should increment refreshCount when triggerRefresh is called', () => {
      expect(service.refreshCount()).toBe(0);
      service.triggerRefresh();
      expect(service.refreshCount()).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from add', async () => {
      mockApi.volunteer.add.mutate.mockRejectedValue(new Error('Server error'));

      await expect(service.add({ name: 'X' } as any)).rejects.toThrow('Server error');
    });
  });
});
