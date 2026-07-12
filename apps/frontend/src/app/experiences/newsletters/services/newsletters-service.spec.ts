import { vi } from 'vitest';
import { NewslettersService } from './newsletters-service';

describe('NewslettersService', () => {
  let service: NewslettersService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      newsletters: {
        create: { mutate: vi.fn() },
        count: { query: vi.fn() },
        getAllWithCounts: { query: vi.fn() },
        getById: { query: vi.fn() },
        getReport: { query: vi.fn() },
        createClickersList: { mutate: vi.fn() },
        update: { mutate: vi.fn() },
        send: { mutate: vi.fn() },
        exportCsv: { mutate: vi.fn() },
      },
    };

    service = Object.create(NewslettersService.prototype) as NewslettersService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
    // No active context in unit tests — add() then sends the payload unstamped
    // and the backend falls back to the office campaign (§15).
    (service as any).campaignContext = { activeCampaignId: () => null };
  });

  it('should create a newsletter', async () => {
    const payload = { name: 'Spring Update', status: 'draft' as const };
    mockApi.newsletters.create.mutate.mockResolvedValue({ id: '1', ...payload });

    const result = await service.add(payload as never);

    expect(mockApi.newsletters.create.mutate).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ id: '1', ...payload });
  });

  it('should resolve addMany with an empty array (bulk add unsupported)', async () => {
    const result = await service.addMany([{ name: 'a' } as never]);
    expect(result).toEqual([]);
  });

  it('should count newsletters', async () => {
    mockApi.newsletters.count.query.mockResolvedValue(7);

    const result = await service.count();

    expect(mockApi.newsletters.count.query).toHaveBeenCalled();
    expect(result).toBe(7);
  });

  it('should get all newsletters and normalize numeric and date fields', async () => {
    mockApi.newsletters.getAllWithCounts.query.mockResolvedValue({
      rows: [
        {
          id: 1,
          status: 'SENT',
          tenant_id: 5,
          createdby_id: 9,
          updatedby_id: 9,
          total_recipients: '100',
          delivered_count: '95',
          open_rate: '42.5',
          send_date: '2026-01-01T00:00:00Z',
          created_at: null,
          top_links: '[{"url":"https://x.com","clicks":5}]',
        },
      ],
      count: '1',
    });

    const result = await service.getAll({ limit: 10, startRow: 0 });

    expect(mockApi.newsletters.getAllWithCounts.query).toHaveBeenCalledWith(
      { limit: 10, startRow: 0 },
      { signal: (service as any).ac.signal },
    );
    expect(result.count).toBe(1);
    expect(result.rows[0].status).toBe('sent');
    expect(result.rows[0].tenant_id).toBe('5');
    expect(result.rows[0].total_recipients).toBe(100);
    expect(result.rows[0].delivered_count).toBe(95);
    expect(result.rows[0].open_rate).toBe(42.5);
    expect(result.rows[0].send_date).toBeInstanceOf(Date);
    expect(result.rows[0].created_at).toBeInstanceOf(Date);
    expect(result.rows[0].top_links).toEqual([{ url: 'https://x.com', clicks: 5 }]);
  });

  it('should fall back to row length when count is missing', async () => {
    mockApi.newsletters.getAllWithCounts.query.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }], count: null });

    const result = await service.getAll();

    expect(result.count).toBe(2);
  });

  it('should return empty results when the API responds with nothing', async () => {
    mockApi.newsletters.getAllWithCounts.query.mockResolvedValue(undefined);

    const result = await service.getAll();

    expect(result).toEqual({ rows: [], count: 0 });
  });

  it('should always resolve getAllArchived with an empty result', async () => {
    const result = await service.getAllArchived();
    expect(result).toEqual({ rows: [], count: 0 });
  });

  it('should get a newsletter by id and normalize it', async () => {
    mockApi.newsletters.getById.query.mockResolvedValue({ id: 1, status: 'DRAFT' });

    const result = await service.getById('1');

    expect(mockApi.newsletters.getById.query).toHaveBeenCalledWith('1');
    expect(result.status).toBe('draft');
  });

  it('should return null/undefined records from getById untouched', async () => {
    mockApi.newsletters.getById.query.mockResolvedValue(null);

    const result = await service.getById('missing');

    expect(result).toBeNull();
  });

  it('should get the report for a newsletter', async () => {
    const report = { timeline: [], bounces: { total: 0, hard: 0, soft: 0, dropped: 0, rows: [] } };
    mockApi.newsletters.getReport.query.mockResolvedValue(report);

    const result = await service.getReport('1');

    expect(mockApi.newsletters.getReport.query).toHaveBeenCalledWith('1');
    expect(result).toEqual(report);
  });

  it('should create a clickers list for a newsletter', async () => {
    const created = { id: '7', name: 'Clicked · Spring Update', members: 12 };
    mockApi.newsletters.createClickersList.mutate.mockResolvedValue(created);

    const result = await service.createClickersList('1');

    expect(mockApi.newsletters.createClickersList.mutate).toHaveBeenCalledWith('1');
    expect(result).toEqual(created);
  });

  it('should always resolve getTags with an empty array', async () => {
    const result = await service.getTags('1');
    expect(result).toEqual([]);
  });

  it('should update a newsletter', async () => {
    mockApi.newsletters.update.mutate.mockResolvedValue({ id: '1', name: 'Updated' });

    const result = await service.update('1', { name: 'Updated' } as never);

    expect(mockApi.newsletters.update.mutate).toHaveBeenCalledWith({ id: '1', data: { name: 'Updated' } });
    expect(result).toEqual({ id: '1', name: 'Updated' });
  });

  it('should send a newsletter', async () => {
    mockApi.newsletters.send.mutate.mockResolvedValue({ success: true });

    const result = await service.send('1');

    expect(mockApi.newsletters.send.mutate).toHaveBeenCalledWith('1');
    expect(result).toEqual({ success: true });
  });

  it('should export newsletters as csv', async () => {
    const input = { ids: ['1', '2'] };
    mockApi.newsletters.exportCsv.mutate.mockResolvedValue({ url: 'https://export.csv' });

    const result = await service.exportCsv(input as never);

    expect(mockApi.newsletters.exportCsv.mutate).toHaveBeenCalledWith(input);
    expect(result).toEqual({ url: 'https://export.csv' });
  });

  it('should return an empty array from attachTag/detachTag without calling the API', async () => {
    const attachResult = await service.attachTag('1', 'vip');
    const detachResult = await service.detachTag('1', 'vip');

    expect(attachResult).toBeUndefined();
    expect(detachResult).toBe(false);
  });
});
