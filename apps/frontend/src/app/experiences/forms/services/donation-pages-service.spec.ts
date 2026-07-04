import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DonationPagesService } from './donation-pages-service';

describe('DonationPagesService', () => {
  let service: DonationPagesService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      webForms: {
        getAllWithCounts: { query: vi.fn() },
      },
    };

    service = Object.create(DonationPagesService.prototype) as DonationPagesService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
  });

  it('should only return donation and recurring_donation form types', async () => {
    mockApi.webForms.getAllWithCounts.query.mockResolvedValue({
      rows: [
        { id: 'f1', form_type: 'standard' },
        { id: 'f2', form_type: 'donation' },
        { id: 'f3', form_type: 'recurring_donation' },
      ],
      count: 3,
    });

    const result = await service.getAll();

    expect(result.rows.map((r: any) => r.id)).toEqual(['f2', 'f3']);
    expect(result.count).toBe(2);
  });

  it('should return an empty page when there are no donation forms', async () => {
    mockApi.webForms.getAllWithCounts.query.mockResolvedValue({
      rows: [{ id: 'f1', form_type: 'standard' }],
      count: 1,
    });

    const result = await service.getAll();

    expect(result).toEqual({ rows: [], count: 0 });
  });
});
