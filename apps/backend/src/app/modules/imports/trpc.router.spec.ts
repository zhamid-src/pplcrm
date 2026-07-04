import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ImportsRouter } from './trpc.router';
import { ImportsController } from './controller';
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

const AUTH = { tenant_id: '1', user_id: '1', session_id: 's1' };
// `isAuthed` merges a `role` field onto `ctx.auth` before calling the
// procedure, so controllers actually receive `{ ...AUTH, role: 'owner' }`.
// Match with objectContaining rather than asserting the exact shape.
const AUTH_MATCHER = expect.objectContaining(AUTH);

describe('ImportsRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthDb();
  });

  it('rejects unauthenticated callers', async () => {
    const caller = ImportsRouter.createCaller({ auth: undefined } as any);
    await expect(caller.getAll()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('calls list on the controller for getAll', async () => {
    const mockImports = [{ id: '1', file_name: 'test.csv', contactCount: 5 }];
    const spy = vi.spyOn(ImportsController.prototype, 'list').mockResolvedValue(mockImports as any);

    const caller = ImportsRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.getAll();

    expect(spy).toHaveBeenCalledWith(AUTH_MATCHER);
    expect(result).toEqual(mockImports);
  });

  it('calls deleteImport on the controller with parsed input', async () => {
    const spy = vi.spyOn(ImportsController.prototype, 'deleteImport').mockResolvedValue({ deleted: true } as any);

    const caller = ImportsRouter.createCaller({ auth: AUTH } as any);
    const input = { id: '42', deleteContacts: true, deleteCompanies: false };
    const result = await caller.delete(input);

    expect(spy).toHaveBeenCalledWith(input, AUTH_MATCHER);
    expect(result).toEqual({ deleted: true });
  });

  it('rejects delete when the id is not a valid numeric id', async () => {
    const caller = ImportsRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.delete({ id: 'not-an-id' } as any)).rejects.toThrow();
  });

  it('propagates errors thrown by the controller', async () => {
    vi.spyOn(ImportsController.prototype, 'deleteImport').mockRejectedValue(new Error('boom'));

    const caller = ImportsRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.delete({ id: '1' })).rejects.toThrow();
  });
});
