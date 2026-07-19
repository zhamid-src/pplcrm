import type { Transaction, Selectable } from 'kysely';
import type { OperationDataType, Models } from '../../../../../../libs/common/src/lib/kysely.models';
import type { IAuthKeyPayload, ReorderSubtasksType } from '../../../../../../libs/common/src';
import { BaseController } from '../../lib/base.controller';
import { NotFoundError } from '../../errors/app-errors';
import { TaskSubtasksRepo } from './repositories/task-subtasks.repo';

export class TaskSubtasksController extends BaseController<'task_subtasks', TaskSubtasksRepo> {
  constructor() {
    super(new TaskSubtasksRepo());
  }

  public getByTaskId(input: { tenant_id: string; task_id: string }) {
    return this.getRepo().getByTaskIdOrdered(input.tenant_id, input.task_id);
  }

  /**
   * Drag-to-reorder the subtasks of one task. `ids` is the full new top-to-bottom
   * order; every id must belong to the tenant and to `task_id` (a foreign or
   * unknown id rejects the whole drop). Writes `position = index` per id in one
   * transaction — never a loop of single-row `updateSubtask` calls.
   */
  public async reorderSubtasks(auth: IAuthKeyPayload, input: ReorderSubtasksType) {
    const repo = this.getRepo();
    return repo.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('task_subtasks')
        .select('id')
        .where('tenant_id', '=', auth.tenant_id)
        .where('task_id', '=', input.task_id)
        .where('id', 'in', input.ids)
        .execute();
      const found = new Set(existing.map((r) => String(r.id)));
      if (found.size !== input.ids.length || input.ids.some((id) => !found.has(String(id)))) {
        throw new NotFoundError('One or more subtasks were not found for this task');
      }

      let index = 0;
      for (const id of input.ids) {
        await trx
          .updateTable('task_subtasks')
          .set({ position: index, updatedby_id: auth.user_id } as OperationDataType<'task_subtasks', 'update'>)
          .where('tenant_id', '=', auth.tenant_id)
          .where('id', '=', id)
          .execute();
        index += 1;
      }

      return { ok: true as const, updated: input.ids.length };
    });
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

  public override async update(input: {
    tenant_id: string;
    id: string;
    row: OperationDataType<'task_subtasks', 'update'>;
  }) {
    const subtaskBefore = (await this.getOneById({ tenant_id: input.tenant_id, id: input.id })) as
      | Selectable<Models['task_subtasks']>
      | undefined;
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

  public updateSubtask(input: { tenant_id: string; id: string; row: OperationDataType<'task_subtasks', 'update'> }) {
    return this.update({ tenant_id: input.tenant_id, id: input.id, row: input.row });
  }
}
