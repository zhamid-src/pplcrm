import { vi } from 'vitest';
import { PersonsService } from './persons-service';

describe('PersonsService', () => {
  let service: PersonsService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      persons: {
        add: { mutate: vi.fn() },
        attachTag: { mutate: vi.fn() },
        count: { query: vi.fn() },
        delete: { mutate: vi.fn() },
        deleteMany: { mutate: vi.fn() },
        moveEntireHousehold: { mutate: vi.fn() },
        detachTag: { mutate: vi.fn() },
        getAllWithAddress: { query: vi.fn() },
        getByHouseholdId: { query: vi.fn() },
        getByCompanyId: { query: vi.fn() },
        countByCompanyId: { query: vi.fn() },
        getById: { query: vi.fn() },
        getActivity: { query: vi.fn() },
        getTags: { query: vi.fn() },
        import: { mutate: vi.fn() },
        removeHousehold: { mutate: vi.fn() },
        update: { mutate: vi.fn() },
        exportCsv: { mutate: vi.fn() },
        getPotentialDuplicates: { query: vi.fn() },
        getDuplicateCounts: { query: vi.fn() },
        mergePersons: { mutate: vi.fn() },
      },
    };

    // Create a bare instance without invoking Angular inject()s
    service = Object.create(PersonsService.prototype) as PersonsService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
    (service as any).endpointName = 'persons';
  });

  describe('delete', () => {
    it('sends force and skip-alert options when both are requested', async () => {
      mockApi.persons.delete.mutate.mockResolvedValue({ id: '1' });

      const result = await service.delete('1', true, true);

      expect(mockApi.persons.delete.mutate).toHaveBeenCalledWith(
        { id: '1', force: true },
        { context: { skipErrorHandler: true } },
      );
      expect(result).toBe(true);
    });

    it('sends only the id when force is not specified', async () => {
      mockApi.persons.delete.mutate.mockResolvedValue({ id: '1' });

      await service.delete('1');

      expect(mockApi.persons.delete.mutate).toHaveBeenCalledWith('1', undefined);
    });

    it('resolves false when the api returns null', async () => {
      mockApi.persons.delete.mutate.mockResolvedValue(null);

      const result = await service.delete('1');

      expect(result).toBe(false);
    });
  });

  describe('deleteMany', () => {
    it('forwards force and skip-alert flags', async () => {
      mockApi.persons.deleteMany.mutate.mockResolvedValue(true);

      const result = await service.deleteMany(['1', '2'], false, true);

      expect(mockApi.persons.deleteMany.mutate).toHaveBeenCalledWith(
        { ids: ['1', '2'], force: false },
        { context: { skipErrorHandler: true } },
      );
      expect(result).toBe(true);
    });
  });

  describe('getPeopleInHousehold', () => {
    it('returns an empty array when no household id is given', async () => {
      const result = await service.getPeopleInHousehold(null);

      expect(result).toEqual([]);
      expect(mockApi.persons.getByHouseholdId.query).not.toHaveBeenCalled();
    });

    it('merges name columns into the request and builds a full_name', async () => {
      mockApi.persons.getByHouseholdId.query.mockResolvedValue([
        { id: '1', first_name: 'Jane', middle_names: '', last_name: 'Doe' },
      ]);

      const result = await service.getPeopleInHousehold('h1', { columns: ['id'] });

      expect(mockApi.persons.getByHouseholdId.query).toHaveBeenCalledWith({
        id: 'h1',
        options: { columns: ['id', 'first_name', 'middle_names', 'last_name'] },
      });
      expect(result).toEqual([
        { id: '1', first_name: 'Jane', middle_names: '', last_name: 'Doe', full_name: 'Jane  Doe' },
      ]);
    });
  });

  describe('getTags', () => {
    it('maps the tag objects returned by the api down to their names', async () => {
      mockApi.persons.getTags.query.mockResolvedValue([{ name: 'donor' }, { name: 'vip' }]);

      const result = await service.getTags('1', 'tag');

      expect(mockApi.persons.getTags.query).toHaveBeenCalledWith({ id: '1', type: 'tag' });
      expect(result).toEqual(['donor', 'vip']);
    });
  });

  describe('getAllArchived', () => {
    it('always resolves with an empty result (archives unsupported)', async () => {
      const result = await service.getAllArchived();

      expect(result).toEqual({ rows: [], count: 0 });
    });
  });

  describe('mergePersons', () => {
    it('delegates to the api mergePersons mutation', async () => {
      const response = { merged: true };
      mockApi.persons.mergePersons.mutate.mockResolvedValue(response);

      const result = await service.mergePersons('target-1', 'source-1');

      expect(mockApi.persons.mergePersons.mutate).toHaveBeenCalledWith({
        target_id: 'target-1',
        source_id: 'source-1',
      });
      expect(result).toEqual(response);
    });
  });

  describe('import', () => {
    it('opts out of the global error handler and forwards rows/tags/skipped/fileName', async () => {
      const response = { imported: 2, skipped: 0 };
      mockApi.persons.import.mutate.mockResolvedValue(response);

      const result = await service.import([{ first_name: 'A' }] as any, ['tag1'], 1, 'people.csv');

      expect(mockApi.persons.import.mutate).toHaveBeenCalledWith(
        { rows: [{ first_name: 'A' }], tags: ['tag1'], skipped: 1, file_name: 'people.csv' },
        { context: { skipErrorHandler: true } },
      );
      expect(result).toEqual(response);
    });
  });
});
