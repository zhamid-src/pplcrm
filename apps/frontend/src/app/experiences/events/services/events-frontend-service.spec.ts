import { signal } from '@angular/core';
import { vi } from 'vitest';
import { EventsFrontendService } from './events-frontend-service';

describe('EventsFrontendService', () => {
  let service: EventsFrontendService;
  let mockApi: any;

  const mockEvent = {
    id: '1',
    name: 'Town Hall',
    slug: 'town-hall',
    location_address: '123 Main St',
    start_time: '2026-08-01T18:00:00Z',
    end_time: '2026-08-01T20:00:00Z',
    capacity: 100,
  };

  beforeEach(() => {
    mockApi = {
      events: {
        add: { mutate: vi.fn() },
        update: { mutate: vi.fn() },
        getAll: { query: vi.fn() },
        getById: { query: vi.fn() },
        delete: { mutate: vi.fn() },
        checkSlugUnique: { query: vi.fn() },
      },
    };

    service = Object.create(EventsFrontendService.prototype) as EventsFrontendService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
    // No active context in unit tests (§15): reads go unscoped, writes unstamped.
    (service as any).campaignContext = { activeCampaignId: () => null };
    (service as any).refreshCount = signal(0);
    (service as any).endpointName = 'events';
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('CRUD operations', () => {
    it('should add an event', async () => {
      mockApi.events.add.mutate.mockResolvedValue(mockEvent);

      const result = await service.add({ name: 'Town Hall' } as any);

      expect(mockApi.events.add.mutate).toHaveBeenCalledWith({ name: 'Town Hall' });
      expect(result).toEqual(mockEvent);
    });

    it('should resolve addMany with an empty array (not implemented server-side)', async () => {
      await expect(service.addMany([{ name: 'Town Hall' } as any])).resolves.toEqual([]);
    });

    it('should get an event by id', async () => {
      mockApi.events.getById.query.mockResolvedValue(mockEvent);

      const result = await service.getById('1');

      expect(mockApi.events.getById.query).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEvent);
    });

    it('should get all events scoped by the abort signal', async () => {
      const mockResult = { rows: [mockEvent], count: 1 };
      mockApi.events.getAll.query.mockResolvedValue(mockResult);

      const result = await service.getAll({ startRow: 0, endRow: 25 } as any);

      expect(mockApi.events.getAll.query).toHaveBeenCalledWith(
        { startRow: 0, endRow: 25 },
        { signal: (service as any).ac.signal },
      );
      expect(result).toEqual(mockResult);
    });

    it('should get archived events by including includeArchived in the query', async () => {
      const mockResult = { rows: [], count: 0 };
      mockApi.events.getAll.query.mockResolvedValue(mockResult);

      await service.getAllArchived({ startRow: 0, endRow: 25 } as any);

      expect(mockApi.events.getAll.query).toHaveBeenCalledWith(
        { startRow: 0, endRow: 25, includeArchived: true },
        { signal: (service as any).ac.signal },
      );
    });

    it('should update an event', async () => {
      const updated = { ...mockEvent, name: 'Town Hall 2' };
      mockApi.events.update.mutate.mockResolvedValue(updated);

      const result = await service.update('1', { name: 'Town Hall 2' } as any);

      expect(mockApi.events.update.mutate).toHaveBeenCalledWith({ id: '1', data: { name: 'Town Hall 2' } });
      expect(result).toEqual(updated);
    });

    it('should delete an event via the inherited AbstractAPIService.delete', async () => {
      mockApi.events.delete.mutate.mockResolvedValue(true);

      const result = await service.delete('1');

      expect(mockApi.events.delete.mutate).toHaveBeenCalledWith('1');
      expect(result).toBe(true);
    });
  });

  describe('Slug checking', () => {
    it('should check whether a slug is unique, excluding the current event when editing', async () => {
      mockApi.events.checkSlugUnique.query.mockResolvedValue({ unique: false });

      const result = await service.checkSlugUnique('town-hall', '1');

      expect(mockApi.events.checkSlugUnique.query).toHaveBeenCalledWith({ slug: 'town-hall', excludeId: '1' });
      expect(result).toEqual({ unique: false });
    });

    it('should check slug uniqueness without an exclude id when creating', async () => {
      mockApi.events.checkSlugUnique.query.mockResolvedValue({ unique: true });

      await service.checkSlugUnique('new-event');

      expect(mockApi.events.checkSlugUnique.query).toHaveBeenCalledWith({ slug: 'new-event', excludeId: undefined });
    });
  });

  describe('Placeholder / unsupported endpoints', () => {
    it('should resolve count from the getAll count field', async () => {
      mockApi.events.getAll.query.mockResolvedValue({ count: 7 });

      await expect(service.count()).resolves.toBe(7);
      expect(mockApi.events.getAll.query).toHaveBeenCalledWith({ startRow: 0, endRow: 1 });
    });

    it('should resolve getTags with an empty array', async () => {
      await expect(service.getTags('1')).resolves.toEqual([]);
    });

    it('should reject exportCsv since event export is not available', async () => {
      await expect(service.exportCsv({} as any)).rejects.toThrow('Event export is not available');
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
    it('should propagate errors from getById', async () => {
      mockApi.events.getById.query.mockRejectedValue(new Error('Not found'));

      await expect(service.getById('missing')).rejects.toThrow('Not found');
    });
  });
});
