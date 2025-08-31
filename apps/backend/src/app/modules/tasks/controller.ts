import type { AddTaskType, UpdateTaskType, getAllOptionsType } from '@common';

import { BaseController } from '../../lib/base.controller';
import type { OperationDataType } from 'common/src/lib/kysely.models';
import { TasksRepo } from './repositories/tasks.repo';
import type { IAuthKeyPayload } from '../../../../../../common/src/lib/auth';

export class TasksController extends BaseController<'tasks', TasksRepo> {
  constructor() {
    super(new TasksRepo());
  }

  public addTask(payload: AddTaskType, auth: IAuthKeyPayload) {
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
    return this.add(row);
  }

  public updateTask(id: string, row: UpdateTaskType, auth: IAuthKeyPayload) {
    const rowWithUpdatedBy = { ...row, updatedby_id: auth.user_id } as OperationDataType<'tasks', 'update'>;
    return this.update({ tenant_id: auth.tenant_id, id, row: rowWithUpdatedBy });
  }

  public async getAllTasks(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    const rows = await this.getAll(auth.tenant_id, options as any);
    const count = await this.getCount(auth.tenant_id);
    return { rows, count } as { rows: any[]; count: number };
  }
}
