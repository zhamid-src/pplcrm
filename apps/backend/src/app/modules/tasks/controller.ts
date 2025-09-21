import type { AddTaskType, ExportCsvInputType, ExportCsvResponseType, UpdateTaskType, getAllOptionsType } from '@common';

import type { IAuthKeyPayload } from '../../../../../../common/src/lib/auth';
import { BaseController } from '../../lib/base.controller';
import { TasksRepo } from './repositories/tasks.repo';
import type { OperationDataType } from 'common/src/lib/kysely.models';

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

  public async getAllTasks(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getAllExcludingArchivedWithCount(auth.tenant_id, options as any);
  }

  public async getArchivedTasks(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getAllArchivedWithCount(auth.tenant_id, options as any);
  }

  public updateTask(id: string, row: UpdateTaskType, auth: IAuthKeyPayload) {
    const rowWithUpdatedBy = { ...row, updatedby_id: auth.user_id } as OperationDataType<'tasks', 'update'>;
    return this.update({ tenant_id: auth.tenant_id, id, row: rowWithUpdatedBy });
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
      return this.buildCsvResponse(rows, input);
    }
    return super.exportCsv(input);
  }
}
