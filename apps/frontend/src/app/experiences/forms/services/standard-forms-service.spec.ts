import { vi, describe, it, expect, beforeEach } from 'vitest';
import { StandardFormsService } from './standard-forms-service';

describe('StandardFormsService', () => {
  let service: StandardFormsService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      webForms: {
        getAllWithCounts: { query: vi.fn() },
      },
    };

    service = Object.create(StandardFormsService.prototype) as StandardFormsService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
  });

  it('should only return forms with no type or the "standard" type', async () => {
    mockApi.webForms.getAllWithCounts.query.mockResolvedValue({
      rows: [
        { id: 'f1', form_type: undefined },
        { id: 'f2', form_type: 'standard' },
        { id: 'f3', form_type: 'donation' },
        { id: 'f4', form_type: 'recurring_donation' },
      ],
      count: 4,
    });

    const result = await service.getAll();

    expect(result.rows.map((r: any) => r.id)).toEqual(['f1', 'f2']);
    expect(result.count).toBe(2);
  });

  it('should return an empty page when every form is a donation type', async () => {
    mockApi.webForms.getAllWithCounts.query.mockResolvedValue({
      rows: [{ id: 'f1', form_type: 'donation' }],
      count: 1,
    });

    const result = await service.getAll();

    expect(result).toEqual({ rows: [], count: 0 });
  });
});
