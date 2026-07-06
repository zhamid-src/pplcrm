import { vi, describe, it, expect, beforeEach } from 'vitest';

import { TasksRouter } from './app/modules/tasks/trpc.router';
import { TasksController } from './app/modules/tasks/controller';
import { BaseRepository } from './app/lib/base.repo';

/**
 * Verifies the session-revocation gate added to the `isAuthed` middleware
 * (SECURITY-REVIEW.md 1.1): an authed request is only allowed when the access
 * token's session_id still maps to an active session row. Deleting the session
 * must reject the still-unexpired access token immediately.
 *
 * The middleware issues two independent `BaseRepository.dbInstance.selectFrom`
 * calls — one for `authusers`, one for `sessions` — so the mock returns a
 * different row per table.
 */
function mockDb(opts: { session: unknown }) {
  const makeQB = (result: unknown): unknown => ({
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue(result),
  });

  vi.spyOn(BaseRepository, 'dbInstance', 'get').mockReturnValue({
    selectFrom: vi.fn((table: string) =>
      table === 'sessions' ? makeQB(opts.session) : makeQB({ role: 'owner', verified: true }),
    ),
  } as never);
}

describe('isAuthed session revocation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows the request when an active session exists', async () => {
    mockDb({ session: { id: 's1', expires_at: null } });
    const spy = vi
      .spyOn(TasksController.prototype, 'updateTask')
      .mockResolvedValue({ id: '1', name: 'Task 1', assigned_to: '3' } as never);

    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' },
    } as never);

    await expect(caller.update({ id: '1', data: { assigned_to: '3' } })).resolves.toBeDefined();
    expect(spy).toHaveBeenCalled();
  });

  it('rejects with UNAUTHORIZED when the session was revoked (no row)', async () => {
    mockDb({ session: undefined });
    const spy = vi.spyOn(TasksController.prototype, 'updateTask').mockResolvedValue({} as never);

    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' },
    } as never);

    await expect(caller.update({ id: '1', data: { assigned_to: '3' } })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects with UNAUTHORIZED when the session has expired', async () => {
    mockDb({ session: { id: 's1', expires_at: new Date(Date.now() - 60_000) } });
    const spy = vi.spyOn(TasksController.prototype, 'updateTask').mockResolvedValue({} as never);

    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' },
    } as never);

    await expect(caller.update({ id: '1', data: { assigned_to: '3' } })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
