import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TasksController } from './controller';
import { NotificationsRepo } from '../notifications/repositories/notifications.repo';
import { TasksRepo } from './repositories/tasks.repo';
import { SettingsRepo } from '../settings/repositories/settings.repo';

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

describe('TasksController SLA breach counting', () => {
  let controller: TasksController;
  const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;

  beforeEach(() => {
    controller = new TasksController();
    vi.restoreAllMocks();
  });

  it('counts only open tasks whose working time exceeds the SLA target', async () => {
    vi.spyOn(SettingsRepo.prototype, 'getAllForTenant').mockResolvedValue([
      { key: 'sla.tasks_hours', value: 24 },
      { key: 'sla.working_days', value: '1,2,3,4,5' },
      { key: 'sla.working_hours_start', value: '09:00' },
      { key: 'sla.working_hours_end', value: '17:00' },
    ] as any);

    const now = new Date('2026-07-08T12:00:00Z'); // a Wednesday
    vi.useFakeTimers();
    vi.setSystemTime(now);

    vi.spyOn(TasksRepo.prototype, 'getOpenForSla').mockResolvedValue([
      // Created 5 working days ago — comfortably breaches a 24h target.
      { id: 't1', created_at: new Date('2026-07-01T12:00:00Z'), assigned_to: 'user-2' },
      // Created moments ago — well inside the target.
      { id: 't2', created_at: new Date('2026-07-08T11:55:00Z'), assigned_to: null },
    ]);

    const count = await controller.countSlaBreaches(auth);

    expect(count).toBe(1);
    vi.useRealTimers();
  });

  it('assembles the four count-sentence numbers via getSummaryCounts', async () => {
    vi.spyOn(SettingsRepo.prototype, 'getAllForTenant').mockResolvedValue([] as any);
    vi.spyOn(TasksRepo.prototype, 'getOpenForSla').mockResolvedValue([]);
    vi.spyOn(TasksRepo.prototype, 'countOpen').mockResolvedValue(12);
    vi.spyOn(TasksRepo.prototype, 'countOpenUnassigned').mockResolvedValue(3);
    vi.spyOn(TasksRepo.prototype, 'countOpenAssignedTo').mockResolvedValue(4);

    const result = await controller.getSummaryCounts(auth);

    expect(result).toEqual({ openTotal: 12, unassigned: 3, assignedToMe: 4, slaBreaches: 0 });
  });
});
