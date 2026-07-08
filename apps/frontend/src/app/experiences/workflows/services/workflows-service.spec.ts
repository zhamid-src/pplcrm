import { vi } from 'vitest';
import { WorkflowsService } from './workflows-service';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      workflows: {
        create: { mutate: vi.fn() },
        count: { query: vi.fn() },
        getAllWithCounts: { query: vi.fn() },
        list: { query: vi.fn() },
        getById: { query: vi.fn() },
        getSteps: { query: vi.fn() },
        saveSteps: { mutate: vi.fn() },
        setStatus: { mutate: vi.fn() },
        getRuns: { query: vi.fn() },
        getEnrollments: { query: vi.fn() },
        enrollPerson: { mutate: vi.fn() },
        cancelEnrollment: { mutate: vi.fn() },
        update: { mutate: vi.fn() },
      },
    };

    service = Object.create(WorkflowsService.prototype) as WorkflowsService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
  });

  it('should reject exportCsv as unsupported for workflows', async () => {
    await expect(service.exportCsv({} as never)).rejects.toThrow('Export CSV is not supported for workflows.');
  });

  it('should create a workflow', async () => {
    const payload = { name: 'Welcome Series', trigger_type: 'manual' as const };
    mockApi.workflows.create.mutate.mockResolvedValue({ id: '1', ...payload });

    const result = await service.add(payload);

    expect(mockApi.workflows.create.mutate).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ id: '1', ...payload });
  });

  it('should resolve addMany with an empty array', async () => {
    const result = await service.addMany([{ name: 'x' } as never]);
    expect(result).toEqual([]);
  });

  it('should count workflows', async () => {
    mockApi.workflows.count.query.mockResolvedValue(4);
    const result = await service.count();
    expect(mockApi.workflows.count.query).toHaveBeenCalled();
    expect(result).toBe(4);
  });

  it('should get all workflows and normalize id/date fields', async () => {
    mockApi.workflows.getAllWithCounts.query.mockResolvedValue({
      rows: [{ id: 7, created_at: null, updated_at: '2026-01-01T00:00:00Z' }],
      count: '1',
    });

    const result = await service.getAll({ limit: 20, startRow: 0 });

    expect(mockApi.workflows.getAllWithCounts.query).toHaveBeenCalledWith(
      { limit: 20, startRow: 0 },
      { signal: (service as any).ac.signal },
    );
    expect(result.count).toBe(1);
    expect(result.rows[0].id).toBe('7');
    expect(result.rows[0].created_at).toBeInstanceOf(Date);
    expect(result.rows[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return an empty result set when the API responds with nothing', async () => {
    mockApi.workflows.getAllWithCounts.query.mockResolvedValue(undefined);
    const result = await service.getAll();
    expect(result).toEqual({ rows: [], count: 0 });
  });

  it('should always resolve getAllArchived with an empty result', async () => {
    const result = await service.getAllArchived();
    expect(result).toEqual({ rows: [], count: 0 });
  });

  it('should get a workflow by id and normalize it', async () => {
    mockApi.workflows.getById.query.mockResolvedValue({ id: 3 });

    const result = await service.getById('3');

    expect(mockApi.workflows.getById.query).toHaveBeenCalledWith('3');
    expect(result.id).toBe('3');
  });

  it('should fetch the enriched automations list', async () => {
    const payload = { rows: [{ id: '1' }], summary: { total: 1, active: 1, runs30d: 5 } };
    mockApi.workflows.list.query.mockResolvedValue(payload);

    const result = await service.list();

    expect(mockApi.workflows.list.query).toHaveBeenCalledWith(undefined, { signal: (service as any).ac.signal });
    expect(result).toEqual(payload);
  });

  it('should set an automation status', async () => {
    mockApi.workflows.setStatus.mutate.mockResolvedValue({ success: true, status: 'paused' });

    const result = await service.setStatus('1', 'paused');

    expect(mockApi.workflows.setStatus.mutate).toHaveBeenCalledWith({ id: '1', status: 'paused' });
    expect(result).toEqual({ success: true, status: 'paused' });
  });

  it('should fetch recent runs', async () => {
    const runs = [{ id: 'r1', status: 'success' }];
    mockApi.workflows.getRuns.query.mockResolvedValue(runs);

    const result = await service.getRuns('1', 10);

    expect(mockApi.workflows.getRuns.query).toHaveBeenCalledWith({ workflowId: '1', limit: 10 });
    expect(result).toEqual(runs);
  });

  it('should get workflow steps', async () => {
    const steps = [{ id: 's1', step_number: 1 }];
    mockApi.workflows.getSteps.query.mockResolvedValue(steps);

    const result = await service.getSteps('1');

    expect(mockApi.workflows.getSteps.query).toHaveBeenCalledWith('1');
    expect(result).toEqual(steps);
  });

  it('should save workflow steps', async () => {
    const steps = [{ step_number: 1, subject: 'Hi' }];
    mockApi.workflows.saveSteps.mutate.mockResolvedValue(true);

    const result = await service.saveSteps('1', steps);

    expect(mockApi.workflows.saveSteps.mutate).toHaveBeenCalledWith({ workflowId: '1', steps });
    expect(result).toBe(true);
  });

  it('should get enrollments for a workflow', async () => {
    const enrollments = [{ id: 'e1' }];
    mockApi.workflows.getEnrollments.query.mockResolvedValue(enrollments);

    const result = await service.getEnrollments('1', { limit: 10 });

    expect(mockApi.workflows.getEnrollments.query).toHaveBeenCalledWith({ workflowId: '1', options: { limit: 10 } });
    expect(result).toEqual(enrollments);
  });

  it('should enroll a person in a workflow', async () => {
    mockApi.workflows.enrollPerson.mutate.mockResolvedValue({ id: 'e2' });

    const result = await service.enrollPerson('1', 'person-1');

    expect(mockApi.workflows.enrollPerson.mutate).toHaveBeenCalledWith({ workflowId: '1', personId: 'person-1' });
    expect(result).toEqual({ id: 'e2' });
  });

  it('should cancel an enrollment', async () => {
    mockApi.workflows.cancelEnrollment.mutate.mockResolvedValue(true);

    const result = await service.cancelEnrollment('e2');

    expect(mockApi.workflows.cancelEnrollment.mutate).toHaveBeenCalledWith({ enrollmentId: 'e2' });
    expect(result).toBe(true);
  });

  it('should always resolve getTags with an empty array', async () => {
    const result = await service.getTags('1');
    expect(result).toEqual([]);
  });

  it('should update a workflow', async () => {
    mockApi.workflows.update.mutate.mockResolvedValue({ id: '1', name: 'Renamed' });

    const result = await service.update('1', { name: 'Renamed' } as never);

    expect(mockApi.workflows.update.mutate).toHaveBeenCalledWith({ id: '1', data: { name: 'Renamed' } });
    expect(result).toEqual({ id: '1', name: 'Renamed' });
  });

  it('should resolve attachTag/detachTag without hitting the API', async () => {
    expect(await service.attachTag('1', 'vip')).toBeUndefined();
    expect(await service.detachTag('1', 'vip')).toBe(false);
  });
});
