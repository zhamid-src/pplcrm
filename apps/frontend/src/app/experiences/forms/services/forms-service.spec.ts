import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FormsService } from './forms-service';

describe('FormsService', () => {
  let service: FormsService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      webForms: {
        add: { mutate: vi.fn() },
        getAllWithCounts: { query: vi.fn() },
        getById: { query: vi.fn() },
        update: { mutate: vi.fn() },
        getSubmissionsCount: { query: vi.fn() },
      },
    };

    service = Object.create(FormsService.prototype) as FormsService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
    // No active context in unit tests (§15): reads go unscoped, writes unstamped.
    (service as any).campaignContext = { activeCampaignId: () => null };
  });

  it('should add a new web form via the add mutation', async () => {
    mockApi.webForms.add.mutate.mockResolvedValue({ id: 'f1' });

    const result = await service.add({ name: 'Signup Form' } as any);

    expect(mockApi.webForms.add.mutate).toHaveBeenCalledWith({ name: 'Signup Form' });
    expect(result).toEqual({ id: 'f1' });
  });

  it('should fetch all forms and normalize date/id fields', async () => {
    mockApi.webForms.getAllWithCounts.query.mockResolvedValue({
      rows: [
        {
          id: 'f1',
          tenant_id: 42,
          createdby_id: 7,
          updatedby_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: null,
          target_tags: null,
          target_lists: undefined,
        },
      ],
      count: '1',
    });

    const result = await service.getAll({ limit: 10 } as any);

    expect(mockApi.webForms.getAllWithCounts.query).toHaveBeenCalledWith(
      { limit: 10 },
      { signal: (service as any).ac.signal },
    );
    expect(result.count).toBe(1);
    expect(result.rows[0].tenant_id).toBe('42');
    expect(result.rows[0].createdby_id).toBe('7');
    expect(result.rows[0].updatedby_id).toBeNull();
    expect(result.rows[0].created_at).toBeInstanceOf(Date);
    expect(result.rows[0].updated_at).toBeInstanceOf(Date);
    expect(result.rows[0].target_tags).toEqual([]);
    expect(result.rows[0].target_lists).toEqual([]);
  });

  it('should fall back to the row count when the query does not return a count', async () => {
    mockApi.webForms.getAllWithCounts.query.mockResolvedValue({
      rows: [{ id: 'f1' }, { id: 'f2' }],
      count: null,
    });

    const result = await service.getAll();

    expect(result.count).toBe(2);
  });

  it('should return an empty page for getAllArchived (not supported)', async () => {
    await expect(service.getAllArchived()).resolves.toEqual({ rows: [], count: 0 });
  });

  it('should fetch and normalize a single form by id', async () => {
    mockApi.webForms.getById.query.mockResolvedValue({
      id: 'f1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });

    const result = await service.getById('f1');

    expect(mockApi.webForms.getById.query).toHaveBeenCalledWith('f1');
    expect(result.id).toBe('f1');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should return null unchanged from getById when the record does not exist', async () => {
    mockApi.webForms.getById.query.mockResolvedValue(null);

    const result = await service.getById('missing');

    expect(result).toBeNull();
  });

  it('should update a form by id via the update mutation', async () => {
    mockApi.webForms.update.mutate.mockResolvedValue({ id: 'f1', name: 'Updated' });

    const result = await service.update('f1', { name: 'Updated' } as any);

    expect(mockApi.webForms.update.mutate).toHaveBeenCalledWith({ id: 'f1', data: { name: 'Updated' } });
    expect(result).toEqual({ id: 'f1', name: 'Updated' });
  });

  it('should fetch the submissions count for a form', async () => {
    mockApi.webForms.getSubmissionsCount.query.mockResolvedValue(12);

    const result = await service.getSubmissionsCount('f1');

    expect(mockApi.webForms.getSubmissionsCount.query).toHaveBeenCalledWith('f1');
    expect(result).toBe(12);
  });

  it('should reject exportCsv since forms do not support CSV export', async () => {
    await expect(service.exportCsv({} as any)).rejects.toThrow('Export CSV not supported for forms.');
  });

  it('should return empty/false placeholders for the unsupported tag operations', async () => {
    await expect(service.attachTag('f1', 'tag')).resolves.toBeUndefined();
    await expect(service.detachTag('f1', 'tag')).resolves.toBe(false);
    await expect(service.getTags('f1')).resolves.toEqual([]);
    await expect(service.addMany([])).resolves.toEqual([]);
    await expect(service.count()).resolves.toBe(0);
  });

  describe('campaign scoping (§15)', () => {
    beforeEach(() => {
      (service as any).campaignContext = { activeCampaignId: () => 'camp-1' };
    });

    it('scopes getAll reads to the active campaign', async () => {
      mockApi.webForms.getAllWithCounts.query.mockResolvedValue({ rows: [], count: 0 });

      await service.getAll({ startRow: 0, endRow: 25 } as any);

      expect(mockApi.webForms.getAllWithCounts.query).toHaveBeenCalledWith(
        { startRow: 0, endRow: 25, campaignId: 'camp-1' },
        { signal: (service as any).ac.signal },
      );
    });

    it('stamps newly created forms with the active campaign id', async () => {
      mockApi.webForms.create = { mutate: vi.fn().mockResolvedValue({ id: 'f1' }) };

      await service.createForm({ name: 'Signup', type: 'signup' } as any);

      expect(mockApi.webForms.create.mutate).toHaveBeenCalledWith({
        name: 'Signup',
        type: 'signup',
        campaign_id: 'camp-1',
      });
    });
  });
});
