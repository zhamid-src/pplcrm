import { BaseController } from '../../lib/base.controller';
import { TaskSubtasksRepo } from './repositories/task-subtasks.repo';

export class TaskSubtasksController extends BaseController<'task_subtasks', TaskSubtasksRepo> {
  constructor() {
    super(new TaskSubtasksRepo());
  }

  public getByTaskId(input: { tenant_id: string; task_id: string }) {
    return (this as any).getRepo().getManyBy('task_id', { tenant_id: input.tenant_id, value: input.task_id });
  }

  public updateSubtask(input: { tenant_id: string; id: string; row: any }) {
    return (this as any).update({ tenant_id: input.tenant_id, id: input.id, row: input.row });
  }
}
