import { BaseController } from '../../lib/base.controller';
import type { OperationDataType } from 'common/src/lib/kysely.models';
import { TaskCommentsRepo } from './repositories/task-comments.repo';

export class TaskCommentsController extends BaseController<'task_comments', TaskCommentsRepo> {
  constructor() {
    super(new TaskCommentsRepo());
  }

  public getByTaskId(input: { tenant_id: string; task_id: string }) {
    return (this as any).getRepo().getManyBy('task_id', { tenant_id: input.tenant_id, value: input.task_id });
  }

  public addComment(row: OperationDataType<'task_comments', 'insert'>) {
    return this.add(row);
  }
}

