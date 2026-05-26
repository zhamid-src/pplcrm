import type { AddTaskType, ExportCsvInputType, ExportCsvResponseType, UpdateTaskType, getAllOptionsType } from '@common';

import type { IAuthKeyPayload } from 'common/src/lib/auth';
import { BaseController } from '../../lib/base.controller';
import { TasksRepo } from './repositories/tasks.repo';
import type { OperationDataType } from 'common/src/lib/kysely.models';
import { NotificationsRepo } from '../notifications/repositories/notifications.repo';

export class TasksController extends BaseController<'tasks', TasksRepo> {
  constructor() {
    super(new TasksRepo());
  }

  public async addTask(payload: AddTaskType, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      details: payload.details,
      due_at: payload.due_at ?? null,
      status: payload.status ?? 'todo',
      priority: payload.priority ?? null,
      completed_at: payload.completed_at ?? null,
      position: payload.position ?? 0,
      assigned_to: payload.assigned_to ?? null,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    } as OperationDataType<'tasks', 'insert'>;
    const task = await this.add(row);
    if (task && payload.assigned_to) {
      try {
        const notificationsRepo = new NotificationsRepo();
        await notificationsRepo.pushNotification({
          tenant_id: auth.tenant_id,
          user_id: payload.assigned_to,
          title: 'Task Assigned',
          message: `You have been assigned the task: "${payload.name}"`,
          type: 'task',
          link: `/tasks/${task.id}`,
        });
      } catch (nErr) {
        console.error('Failed to push notification for task assignment', nErr);
      }
    }
    return task;
  }

  public async getAllTasks(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getAllExcludingArchivedWithCount(auth.tenant_id, options as any);
  }

  public async getArchivedTasks(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getAllArchivedWithCount(auth.tenant_id, options as any);
  }

  public async updateTask(id: string, row: UpdateTaskType, auth: IAuthKeyPayload) {
    const existingTask = await this.getOneById({ tenant_id: auth.tenant_id, id }) as any;
    const rowWithUpdatedBy = { ...row, updatedby_id: auth.user_id } as OperationDataType<'tasks', 'update'>;
    const updated = await this.update({ tenant_id: auth.tenant_id, id, row: rowWithUpdatedBy });

    if (updated && row.assigned_to && row.assigned_to !== existingTask?.assigned_to) {
      try {
        const notificationsRepo = new NotificationsRepo();
        await notificationsRepo.pushNotification({
          tenant_id: auth.tenant_id,
          user_id: row.assigned_to,
          title: 'Task Assigned',
          message: `You have been assigned the task: "${updated.name}"`,
          type: 'task',
          link: `/tasks/${id}`,
        });
      } catch (nErr) {
        console.error('Failed to push notification for task assignment', nErr);
      }
    }
    return updated;
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    if (auth) {
      const includeArchived = Boolean(input?.options && (input.options as any)?.includeArchived);
      const result = includeArchived
        ? await this.getArchivedTasks(auth, input?.options)
        : await this.getAllTasks(auth, input?.options);
      const rows = (result?.rows ?? []).map((row) => ({ ...(row as Record<string, unknown>) }));
      const response = this.buildCsvResponse(rows, input);
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'export',
        entity: includeArchived ? 'tasks_archived' : 'tasks',
        quantity: response.rowCount,
        metadata: {
          requested_columns: Array.isArray(input.columns) ? input.columns.slice(0, 12) : [],
          returned_columns: response.columns.slice(0, 12),
          file_name: response.fileName,
          include_archived: includeArchived,
        },
      });
      return response;
    }
    return super.exportCsv(input, auth);
  }
}
