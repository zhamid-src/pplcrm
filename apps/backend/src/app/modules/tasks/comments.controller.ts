import { BaseController } from '../../lib/base.controller';
import type { OperationDataType } from 'common/src/lib/kysely.models';
import { TaskCommentsRepo } from './repositories/task-comments.repo';
import { processMentions } from '../../lib/mail/mentions-util';

export class TaskCommentsController extends BaseController<'task_comments', TaskCommentsRepo> {
  constructor() {
    super(new TaskCommentsRepo());
  }

  public getByTaskId(input: { tenant_id: string; task_id: string }) {
    return (this as any).getRepo().getManyBy('task_id', { tenant_id: input.tenant_id, value: input.task_id });
  }

  public async addComment(row: OperationDataType<'task_comments', 'insert'>) {
    const comment = await this.add(row);
    if (comment && row.comment && row.task_id && row.tenant_id && row.createdby_id) {
      const commentLink = `http://localhost:4200/tasks/${row.task_id}`;
      processMentions(
        this.getRepo().db,
        String(row.tenant_id),
        row.comment,
        commentLink,
        String(row.createdby_id)
      ).catch((err) => console.error('Failed to process task comment mentions', err));
    }
    return comment;
  }
}


