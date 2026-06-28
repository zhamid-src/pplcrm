import type { Transaction } from 'kysely';
import type { OperationDataType, Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { BaseController } from '../../lib/base.controller';
import { TaskSubtasksRepo } from './repositories/task-subtasks.repo';

export class TaskSubtasksController extends BaseController<'task_subtasks', TaskSubtasksRepo> {
  constructor() {
    super(new TaskSubtasksRepo());
  }

  public getByTaskId(input: { tenant_id: string; task_id: string }) {
    return (this as any).getRepo().getManyBy('task_id', { tenant_id: input.tenant_id, value: input.task_id });
  }

  public override async add(row: OperationDataType<'task_subtasks', 'insert'>, trx?: Transaction<Models>) {
    const subtask = await super.add(row, trx);
    if (subtask && row.task_id && row.tenant_id && row.createdby_id) {
      await this.userActivity.log(
        {
          tenant_id: String(row.tenant_id),
          user_id: String(row.createdby_id),
          activity: 'update',
          entity: 'tasks',
          entity_id: String(row.task_id),
          quantity: 1,
          metadata: { action: 'add_subtask', subtask_name: row.name },
        },
        trx,
      );
    }
    return subtask;
  }

  public override async update(input: { tenant_id: string; id: string; row: any }) {
    const subtaskBefore = (await this.getOneById({ tenant_id: input.tenant_id, id: input.id })) as any;
    const result = await super.update(input);
    if (result && subtaskBefore) {
      const actorId = input.row.updatedby_id || subtaskBefore.updatedby_id || '';
      if (input.row.status && input.row.status !== subtaskBefore.status && actorId) {
        await this.userActivity.log({
          tenant_id: input.tenant_id,
          user_id: String(actorId),
          activity: 'update',
          entity: 'tasks',
          entity_id: String(subtaskBefore.task_id),
          quantity: 1,
          metadata: {
            action: 'toggle_subtask',
            subtask_name: subtaskBefore.name,
            status: input.row.status,
          },
        });
      }
    }
    return result;
  }

  public updateSubtask(input: { tenant_id: string; id: string; row: any }) {
    return this.update({ tenant_id: input.tenant_id, id: input.id, row: input.row });
  }
}
