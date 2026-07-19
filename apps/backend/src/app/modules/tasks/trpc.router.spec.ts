import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TasksRouter } from './trpc.router';
import { TasksController } from './controller';
import { TaskSubtasksController } from './subtasks.controller';
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

describe('TasksRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthDb();
  });

  it('should allow updating task with assigned_to as a valid numeric string', async () => {
    const mockTask = { id: '1', name: 'Task 1', assigned_to: '3' };
    const spy = vi.spyOn(TasksController.prototype, 'updateTask').mockResolvedValue(mockTask as any);

    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    const result = await caller.update({
      id: '1',
      data: { assigned_to: '3' },
    });

    expect(spy).toHaveBeenCalledWith('1', { assigned_to: '3' }, expect.any(Object));
    expect(result).toEqual(mockTask);
  });

  it('should allow updating task with assigned_to as null (unassign)', async () => {
    const mockTask = { id: '1', name: 'Task 1', assigned_to: null };
    const spy = vi.spyOn(TasksController.prototype, 'updateTask').mockResolvedValue(mockTask as any);

    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    const result = await caller.update({
      id: '1',
      data: { assigned_to: null },
    });

    expect(spy).toHaveBeenCalledWith('1', { assigned_to: null }, expect.any(Object));
    expect(result).toEqual(mockTask);
  });

  it('should throw validation error when assigned_to is an invalid format (non-digits)', async () => {
    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    await expect(
      caller.update({
        id: '1',
        data: { assigned_to: 'abc' },
      }),
    ).rejects.toThrow();
  });

  it('should delegate countSlaBreaches to the controller (sidebar badge, spec §4)', async () => {
    const spy = vi.spyOn(TasksController.prototype, 'countSlaBreaches').mockResolvedValue(2);
    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    const result = await caller.countSlaBreaches();

    expect(spy).toHaveBeenCalled();
    expect(result).toBe(2);
  });

  it('should delegate getSummaryCounts to the controller (list/board count sentences)', async () => {
    const summary = { openTotal: 12, unassigned: 3, assignedToMe: 4, slaBreaches: 2 };
    const spy = vi.spyOn(TasksController.prototype, 'getSummaryCounts').mockResolvedValue(summary);
    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    const result = await caller.getSummaryCounts();

    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(summary);
  });

  it('should delegate board reorder to the controller with the parsed columns', async () => {
    const spy = vi.spyOn(TasksController.prototype, 'reorderTasks').mockResolvedValue({ ok: true, updated: 2 } as any);
    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    const input = { columns: [{ status: 'in_progress' as const, ids: ['2', '1'] }] };
    const result = await caller.reorder(input);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: '1' }), input);
    expect(result).toEqual({ ok: true, updated: 2 });
  });

  it('should reject a reorder with no columns, empty ids, too many columns, or a non-board status', async () => {
    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    await expect(caller.reorder({ columns: [] } as any)).rejects.toThrow();
    await expect(caller.reorder({ columns: [{ status: 'todo', ids: [] }] } as any)).rejects.toThrow();
    await expect(
      caller.reorder({
        columns: [
          { status: 'todo', ids: ['1'] },
          { status: 'done', ids: ['2'] },
          { status: 'waiting', ids: ['3'] },
        ],
      } as any),
    ).rejects.toThrow();
    await expect(caller.reorder({ columns: [{ status: 'archived', ids: ['1'] }] } as any)).rejects.toThrow();
  });

  it('should delegate subtask reorder to the subtasks controller', async () => {
    const spy = vi
      .spyOn(TaskSubtasksController.prototype, 'reorderSubtasks')
      .mockResolvedValue({ ok: true, updated: 2 } as any);
    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    const result = await caller.reorderSubtasks({ task_id: '9', ids: ['2', '1'] });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: '1' }), { task_id: '9', ids: ['2', '1'] });
    expect(result).toEqual({ ok: true, updated: 2 });
  });
});
