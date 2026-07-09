import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FilesRouter } from './trpc.router';
import { FilesController } from './controller';
import { BaseRepository } from '../../lib/base.repo';

function mockAuthDb() {
  const mockQB: any = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue({ role: 'owner', verified: true }),
  };
  vi.spyOn(BaseRepository, 'dbInstance', 'get').mockReturnValue({
    selectFrom: vi.fn().mockReturnValue(mockQB),
  } as any);
}

const AUTH = { tenant_id: '10', user_id: '20', session_id: 's1' };
// `isAuthed` merges a `role` field onto `ctx.auth` before calling the
// procedure, so controllers actually receive `{ ...AUTH, role: 'owner' }`.
// Match with objectContaining rather than asserting the exact shape.
const AUTH_MATCHER = expect.objectContaining(AUTH);

describe('FilesRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthDb();
  });

  it('rejects unauthenticated callers', async () => {
    const caller = FilesRouter.createCaller({ auth: undefined } as any);
    await expect(caller.getAll({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('calls getAllFiles on the controller', async () => {
    const mockResult = { rows: [{ id: '1', filename: 'a.pdf' }], count: 1 };
    const spy = vi.spyOn(FilesController.prototype, 'getAllFiles').mockResolvedValue(mockResult as any);

    const caller = FilesRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.getAll({});

    expect(spy).toHaveBeenCalledWith(AUTH_MATCHER, {});
    expect(result).toEqual(mockResult);
  });

  it('generates a unique storage key scoped to the tenant and returns the upload URL', async () => {
    const spy = vi
      .spyOn(FilesController.prototype, 'generateUploadSasUrl')
      .mockResolvedValue('https://mock-storage.example.com/sas-url');

    const caller = FilesRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.getUploadUrl({ filename: 'report.pdf', mimeType: 'application/pdf' });

    expect(result.uploadUrl).toBe('https://mock-storage.example.com/sas-url');
    expect(result.storageKey).toMatch(new RegExp(`^uploads/${AUTH.tenant_id}/.+_report\\.pdf$`));
    expect(spy).toHaveBeenCalledWith(result.storageKey);
  });

  it('calls registerFile on the controller with the parsed input', async () => {
    const mockFile = { id: '1', filename: 'report.pdf' };
    const spy = vi.spyOn(FilesController.prototype, 'registerFile').mockResolvedValue(mockFile as any);

    const caller = FilesRouter.createCaller({ auth: AUTH } as any);
    const input = { filename: 'report.pdf', storageKey: 'uploads/10/xyz_report.pdf', sizeBytes: 100 };
    const result = await caller.registerFile(input);

    expect(spy).toHaveBeenCalledWith(input, AUTH_MATCHER);
    expect(result).toEqual(mockFile);
  });

  it('rejects registerFile when storageKey is missing', async () => {
    const caller = FilesRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.registerFile({ filename: 'report.pdf' } as any)).rejects.toThrow();
  });

  it('calls delete on the controller with tenant/user scoping', async () => {
    const spy = vi.spyOn(FilesController.prototype, 'delete').mockResolvedValue(true as any);

    const caller = FilesRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.delete('1');

    expect(spy).toHaveBeenCalledWith('10', '1', '20');
    expect(result).toBe(true);
  });

  it('rejects deleteMany with an empty array of ids', async () => {
    const caller = FilesRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.deleteMany([])).rejects.toThrow();
  });

  it('calls deleteMany on the controller with tenant/user scoping', async () => {
    const spy = vi.spyOn(FilesController.prototype, 'deleteMany').mockResolvedValue(true as any);

    const caller = FilesRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.deleteMany(['1', '2']);

    expect(spy).toHaveBeenCalledWith('10', ['1', '2'], '20');
    expect(result).toBe(true);
  });

  it('calls getUsageSummary on the controller', async () => {
    const mockSummary = { usedBytes: 100, quotaBytes: 1000, planLabel: 'Free trial', largestFiles: [] };
    const spy = vi.spyOn(FilesController.prototype, 'getUsageSummary').mockResolvedValue(mockSummary as any);

    const caller = FilesRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.getUsageSummary();

    expect(spy).toHaveBeenCalledWith(AUTH_MATCHER);
    expect(result).toEqual(mockSummary);
  });

  it('accepts entityType/entityId filters on getAll', async () => {
    const mockResult = { rows: [], count: 0 };
    const spy = vi.spyOn(FilesController.prototype, 'getAllFiles').mockResolvedValue(mockResult as any);

    const caller = FilesRouter.createCaller({ auth: AUTH } as any);
    await caller.getAll({ entityType: 'newsletter', entityId: '5' });

    expect(spy).toHaveBeenCalledWith(AUTH_MATCHER, { entityType: 'newsletter', entityId: '5' });
  });
});
