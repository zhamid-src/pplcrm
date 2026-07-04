import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AbstractAPIService } from './abstract-api.service';

class TestApiService extends AbstractAPIService<'persons', unknown> {
  protected override readonly endpointName = 'persons';

  public add() {
    return Promise.resolve({});
  }
  public addMany() {
    return Promise.resolve([]);
  }
  public attachTag() {
    return Promise.resolve();
  }
  public count() {
    return Promise.resolve(0);
  }
  public detachTag() {
    return Promise.resolve();
  }
  public getAll() {
    return Promise.resolve({ rows: [], count: 0 });
  }
  public getAllArchived() {
    return Promise.resolve({ rows: [], count: 0 });
  }
  public getById() {
    return Promise.resolve({});
  }
  public getTags() {
    return Promise.resolve([]);
  }
  public update() {
    return Promise.resolve([]);
  }
  public exportCsv() {
    return Promise.resolve({} as never);
  }
}

describe('AbstractAPIService', () => {
  let service: TestApiService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      persons: {
        delete: { mutate: vi.fn() },
      },
      exports: {
        queue: { mutate: vi.fn() },
      },
    };

    service = Object.create(TestApiService.prototype) as TestApiService;
    (service as any).api = mockApi;
    (service as any).endpointName = 'persons';
    (service as any).refreshCount = signal(0);
  });

  describe('refresh tracking', () => {
    it('starts at zero and increments on triggerRefresh', () => {
      expect(service.refreshCount()).toBe(0);

      service.triggerRefresh();
      service.triggerRefresh();

      expect(service.refreshCount()).toBe(2);
    });
  });

  describe('delete', () => {
    it('resolves true when the mutation returns a non-null value', async () => {
      mockApi.persons.delete.mutate.mockResolvedValue({ id: '1' });

      const result = await service.delete('1');

      expect(mockApi.persons.delete.mutate).toHaveBeenCalledWith('1');
      expect(result).toBe(true);
    });

    it('resolves false when the mutation returns null', async () => {
      mockApi.persons.delete.mutate.mockResolvedValue(null);

      const result = await service.delete('1');

      expect(result).toBe(false);
    });

    it('throws when the endpoint is not registered on the api client', async () => {
      (service as any).endpointName = 'doesNotExist';

      await expect(service.delete('1')).rejects.toThrow('Endpoint for "doesNotExist" not found on tRPC client.');
    });
  });

  describe('deleteMany', () => {
    it('uses a bulk deleteMany mutation when the endpoint exposes one', async () => {
      mockApi.persons.deleteMany = { mutate: vi.fn().mockResolvedValue(true) };

      const result = await service.deleteMany(['1', '2']);

      expect(mockApi.persons.deleteMany.mutate).toHaveBeenCalledWith(['1', '2']);
      expect(result).toBe(true);
    });

    it('falls back to calling delete() once per id when no bulk endpoint exists', async () => {
      mockApi.persons.delete.mutate.mockResolvedValue({ id: '1' });

      const result = await service.deleteMany(['1', '2']);

      expect(mockApi.persons.delete.mutate).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });

    it('resolves false if any of the individual deletes fail', async () => {
      mockApi.persons.delete.mutate.mockResolvedValueOnce({ id: '1' }).mockResolvedValueOnce(null);

      const result = await service.deleteMany(['1', '2']);

      expect(result).toBe(false);
    });
  });

  describe('queueExport', () => {
    it('delegates to the exports.queue mutation', async () => {
      const input = { entity: 'persons' } as any;
      const response = { id: 'export-1' } as any;
      mockApi.exports.queue.mutate.mockResolvedValue(response);

      const result = await service.queueExport(input);

      expect(mockApi.exports.queue.mutate).toHaveBeenCalledWith(input);
      expect(result).toEqual(response);
    });
  });
});
