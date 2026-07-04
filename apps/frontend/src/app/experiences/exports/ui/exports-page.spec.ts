import { signal } from '@angular/core';
import { vi } from 'vitest';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { ExportsPage } from './exports-page';
import * as httpDownload from '../../../services/api/http-download';

vi.mock('../../../services/api/http-download', () => ({
  downloadWithAuthHeader: vi.fn(),
}));

const baseJob = {
  id: 'job-1',
  entity: 'people',
  file_name: 'people-export.csv',
  status: 'completed' as const,
  row_count: 42,
  created_at: new Date().toISOString(),
  createdBy: { name: 'Admin', email: 'admin@example.com' },
};

describe('ExportsPage', () => {
  let component: ExportsPage;
  let mockApi: any;
  let mockAlertSvc: any;
  let mockTokenSvc: any;
  let mockDialogSvc: any;

  beforeEach(() => {
    vi.mocked(httpDownload.downloadWithAuthHeader).mockReset();
    mockApi = {
      exports: {
        list: { query: vi.fn().mockResolvedValue([baseJob]) },
        delete: { mutate: vi.fn().mockResolvedValue(undefined) },
      },
    };
    mockAlertSvc = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };
    mockTokenSvc = {
      getAuthToken: vi.fn().mockReturnValue('token-123'),
    };
    mockDialogSvc = {
      confirm: vi.fn().mockResolvedValue(true),
    };

    // Bypass the real constructor (which builds a live tRPC client) and wire
    // up the class fields the component actually relies on, mirroring the
    // bare-instance pattern used for other TRPCService-derived services.
    component = Object.create(ExportsPage.prototype) as ExportsPage;
    (component as any).api = mockApi;
    (component as any).alertSvc = mockAlertSvc;
    (component as any).tokenSvc = mockTokenSvc;
    (component as any).dialogs = mockDialogSvc;
    (component as any).jobs = signal<unknown[]>([]);
    (component as any)._loading = createLoadingGate();
  });

  it('should load export jobs into the jobs signal', async () => {
    await component['load']();

    expect(mockApi.exports.list.query).toHaveBeenCalled();
    expect(component['jobs']()).toEqual([baseJob]);
  });

  it('should default jobs to an empty array when the API returns nothing', async () => {
    mockApi.exports.list.query.mockResolvedValue(undefined);

    await component['load']();

    expect(component['jobs']()).toEqual([]);
  });

  it('should show an error alert when loading fails', async () => {
    mockApi.exports.list.query.mockRejectedValue(new Error('boom'));

    await component['load']();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Failed to load exports. Please try again.');
  });

  it('should reload jobs when refresh is invoked', () => {
    const loadSpy = vi.spyOn(component as any, 'load').mockResolvedValue(undefined);

    component['refresh']();

    expect(loadSpy).toHaveBeenCalled();
  });

  it('should identify jobs older than 30 days as expired', () => {
    const oldJob = { ...baseJob, created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() };
    const recentJob = { ...baseJob, created_at: new Date().toISOString() };

    expect(component['isExpired'](oldJob as never)).toBe(true);
    expect(component['isExpired'](recentJob as never)).toBe(false);
  });

  it('should download a completed, non-expired job', async () => {
    const spy = vi.mocked(httpDownload.downloadWithAuthHeader).mockResolvedValue(undefined);

    await component['downloadJob'](baseJob as never);

    expect(mockTokenSvc.getAuthToken).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining(`/api/exports/download/${baseJob.id}`),
      'token-123',
      baseJob.file_name,
    );
    expect(mockAlertSvc.showError).not.toHaveBeenCalled();
  });

  it('should refuse to download an expired job', async () => {
    const spy = vi.mocked(httpDownload.downloadWithAuthHeader);
    const expiredJob = { ...baseJob, created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() };

    await component['downloadJob'](expiredJob as never);

    expect(spy).not.toHaveBeenCalled();
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('This export has expired (30+ days old).');
  });

  it('should refuse to download a job that is not completed', async () => {
    const spy = vi.mocked(httpDownload.downloadWithAuthHeader);
    const pendingJob = { ...baseJob, status: 'pending' as const };

    await component['downloadJob'](pendingJob as never);

    expect(spy).not.toHaveBeenCalled();
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Export is not ready yet.');
  });

  it('should show an error alert when the download itself fails', async () => {
    vi.mocked(httpDownload.downloadWithAuthHeader).mockRejectedValue(new Error('stream failed'));

    await component['downloadJob'](baseJob as never);

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Failed to download export');
  });

  it('should not delete a job when the confirmation dialog is dismissed', async () => {
    mockDialogSvc.confirm.mockResolvedValue(false);

    await component['deleteJob'](baseJob as never);

    expect(mockApi.exports.delete.mutate).not.toHaveBeenCalled();
  });

  it('should delete a job and reload the list after confirmation', async () => {
    await component['deleteJob'](baseJob as never);

    expect(mockApi.exports.delete.mutate).toHaveBeenCalledWith({ id: baseJob.id });
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Export deleted successfully.');
    expect(mockApi.exports.list.query).toHaveBeenCalled();
  });

  it('should show an error alert when deleting a job fails', async () => {
    mockApi.exports.delete.mutate.mockRejectedValue(new Error('cannot delete'));

    await component['deleteJob'](baseJob as never);

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Failed to delete export. Please try again.');
  });

  it('should format ISO dates into a locale string', () => {
    const formatted = component['formatDate']('2026-01-01T00:00:00Z');
    expect(formatted).toEqual(expect.any(String));
    expect(formatted.length).toBeGreaterThan(0);
  });
});
