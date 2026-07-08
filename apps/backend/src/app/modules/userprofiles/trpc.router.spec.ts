import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserProfilesRouter } from './trpc.router';
import { UserProfilesController } from './controller';
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

function caller() {
  return UserProfilesRouter.createCaller({
    auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
  } as any);
}

describe('UserProfilesRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthDb();
  });

  it('should call getOneById on the controller with valid numeric ID', async () => {
    const mockProfile = { id: '2', last_name: 'Smith' };
    const spy = vi.spyOn(UserProfilesController.prototype, 'getOneById').mockResolvedValue(mockProfile as any);

    const result = await caller().getById('2');

    expect(spy).toHaveBeenCalledWith({ tenant_id: '1', id: '2' });
    expect(result).toEqual(mockProfile);
  });

  it('should reject a non-numeric profile id', async () => {
    await expect(caller().getById('not-a-number')).rejects.toThrow();
  });

  it('should reject an unauthenticated caller', async () => {
    vi.spyOn(BaseRepository, 'dbInstance', 'get').mockReturnValue({
      selectFrom: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    const anonCaller = UserProfilesRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    await expect(anonCaller.getById('2')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
