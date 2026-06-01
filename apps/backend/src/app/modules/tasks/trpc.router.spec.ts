import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TasksRouter } from './trpc.router';
import { TasksController } from './controller';

describe('TasksRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow updating task with assigned_to as a valid numeric string', async () => {
    const mockTask = { id: '1', name: 'Task 1', assigned_to: '3' };
    const spy = vi.spyOn(TasksController.prototype, 'updateTask').mockResolvedValue(mockTask as any);

    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any
    } as any);

    const result = await caller.update({
      id: '1',
      data: { assigned_to: '3' }
    });

    expect(spy).toHaveBeenCalledWith('1', { assigned_to: '3' }, expect.any(Object));
    expect(result).toEqual(mockTask);
  });

  it('should allow updating task with assigned_to as null (unassign)', async () => {
    const mockTask = { id: '1', name: 'Task 1', assigned_to: null };
    const spy = vi.spyOn(TasksController.prototype, 'updateTask').mockResolvedValue(mockTask as any);

    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any
    } as any);

    const result = await caller.update({
      id: '1',
      data: { assigned_to: null }
    });

    expect(spy).toHaveBeenCalledWith('1', { assigned_to: null }, expect.any(Object));
    expect(result).toEqual(mockTask);
  });

  it('should throw validation error when assigned_to is an invalid format (non-digits)', async () => {
    const caller = TasksRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any
    } as any);

    await expect(caller.update({
      id: '1',
      data: { assigned_to: 'abc' }
    })).rejects.toThrow();
  });
});
