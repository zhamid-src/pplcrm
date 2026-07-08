import { vi } from 'vitest';
import { ImportsService } from './imports-service';

describe('ImportsService', () => {
  let service: ImportsService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      imports: {
        getAll: { query: vi.fn() },
        delete: { mutate: vi.fn() },
      },
    };

    service = Object.create(ImportsService.prototype) as ImportsService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
  });

  it('should list imports and coerce date fields', async () => {
    mockApi.imports.getAll.query.mockResolvedValue([
      { id: '1', fileName: 'a.csv', createdAt: '2026-01-01T00:00:00Z', processedAt: '2026-01-01T01:00:00Z' },
    ]);

    const result = await service.list();

    expect(mockApi.imports.getAll.query).toHaveBeenCalledWith(undefined, { signal: (service as any).ac.signal });
    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].processedAt).toBeInstanceOf(Date);
  });

  it('should default missing date fields to the epoch', async () => {
    mockApi.imports.getAll.query.mockResolvedValue([{ id: '2', fileName: 'b.csv' }]);

    const result = await service.list();

    expect(result[0].createdAt).toEqual(new Date(0));
    expect(result[0].processedAt).toEqual(new Date(0));
  });

  it('should return an empty array when the API responds with nothing', async () => {
    mockApi.imports.getAll.query.mockResolvedValue(undefined);

    const result = await service.list();

    expect(result).toEqual([]);
  });

  it('should delete an import without options', async () => {
    mockApi.imports.delete.mutate.mockResolvedValue(true);

    const result = await service.delete('import-1');

    expect(mockApi.imports.delete.mutate).toHaveBeenCalledWith({ id: 'import-1' });
    expect(result).toBe(true);
  });

  it('should delete an import along with its associated records', async () => {
    mockApi.imports.delete.mutate.mockResolvedValue(true);

    await service.delete('import-1', { deletePeople: true, deleteHouseholds: true });

    expect(mockApi.imports.delete.mutate).toHaveBeenCalledWith({
      id: 'import-1',
      deletePeople: true,
      deleteHouseholds: true,
    });
  });

  it('should propagate errors from the delete mutation', async () => {
    mockApi.imports.delete.mutate.mockRejectedValue(new Error('cannot delete'));

    await expect(service.delete('import-1')).rejects.toThrow('cannot delete');
  });
});
