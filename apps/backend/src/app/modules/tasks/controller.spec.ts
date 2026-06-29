import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TasksController } from './controller';
import { NotificationsRepo } from '../notifications/repositories/notifications.repo';

describe('TasksController Notifications', () => {
  let controller: TasksController;

  beforeEach(() => {
    controller = new TasksController();
    vi.restoreAllMocks();
  });

  it('should push notification on addTask if assigned_to is present', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const payload = {
      name: 'Test Task',
      assigned_to: 'user-2',
    } as any;

    const mockTask = { id: 'task-1', name: 'Test Task' };
    const addSpy = vi.spyOn(controller, 'add').mockResolvedValue(mockTask as any);
    const pushSpy = vi.spyOn(NotificationsRepo.prototype, 'pushNotification').mockResolvedValue(null as any);

    const result = await controller.addTask(payload, auth);

    expect(addSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      user_id: 'user-2',
      title: 'Task Assigned',
      message: 'You have been assigned the task: "Test Task"',
      type: 'task',
      link: '/tasks/task-1',
    });
    expect(result).toEqual(mockTask);
  });

  it('should push notification on updateTask if assignee changed', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const updatePayload = {
      assigned_to: 'user-3',
    } as any;

    const mockExistingTask = { id: 'task-1', name: 'Existing Task', assigned_to: 'user-2' };
    const mockUpdatedTask = { id: 'task-1', name: 'Existing Task', assigned_to: 'user-3' };

    const getSpy = vi.spyOn(controller, 'getOneById').mockResolvedValue(mockExistingTask as any);
    const updateSpy = vi.spyOn(controller, 'update').mockResolvedValue(mockUpdatedTask as any);
    const pushSpy = vi.spyOn(NotificationsRepo.prototype, 'pushNotification').mockResolvedValue(null as any);

    const result = await controller.updateTask('task-1', updatePayload, auth);

    expect(getSpy).toHaveBeenCalledWith({ tenant_id: 'tenant-1', id: 'task-1' });
    expect(updateSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      user_id: 'user-3',
      title: 'Task Assigned',
      message: 'You have been assigned the task: "Existing Task"',
      type: 'task',
      link: '/tasks/task-1',
    });
    expect(result).toEqual(mockUpdatedTask);
  });

  it('should NOT push notification on updateTask if assignee did not change', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const updatePayload = {
      assigned_to: 'user-2',
    } as any;

    const mockExistingTask = { id: 'task-1', name: 'Existing Task', assigned_to: 'user-2' };
    const mockUpdatedTask = { id: 'task-1', name: 'Existing Task', assigned_to: 'user-2' };

    const _getSpy = vi.spyOn(controller, 'getOneById').mockResolvedValue(mockExistingTask as any);
    const _updateSpy = vi.spyOn(controller, 'update').mockResolvedValue(mockUpdatedTask as any);
    const pushSpy = vi.spyOn(NotificationsRepo.prototype, 'pushNotification');

    await controller.updateTask('task-1', updatePayload, auth);

    expect(pushSpy).not.toHaveBeenCalled();
  });
});
