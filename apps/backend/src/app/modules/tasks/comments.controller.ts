import { env } from '../../../env';
import { BaseController } from '../../lib/base.controller';
import type { Transaction } from 'kysely';
import type { OperationDataType, Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { TaskCommentsRepo } from './repositories/task-comments.repo';
import { processMentions } from '../../lib/mail/mentions-util';
import { logger } from '../../logger';

export class TaskCommentsController extends BaseController<'task_comments', TaskCommentsRepo> {
  constructor() {
    super(new TaskCommentsRepo());
  }

  public getByTaskId(input: { tenant_id: string; task_id: string }) {
    return (this as any).getRepo().getManyBy('task_id', { tenant_id: input.tenant_id, value: input.task_id });
  }

  public override async add(row: OperationDataType<'task_comments', 'insert'>, trx?: Transaction<Models>) {
    const comment = await super.add(row, trx);
    if (comment && row.comment && row.task_id && row.tenant_id) {
      const actorId = row.createdby_id || row.author_id || '';
      if (actorId) {
        await this.userActivity.log(
          {
            tenant_id: String(row.tenant_id),
            user_id: String(actorId),
            activity: 'update',
            entity: 'tasks',
            entity_id: String(row.task_id),
            quantity: 1,
            metadata: { action: 'add_comment', comment_id: comment.id },
          },
          trx,
        );
      }

      const commentLink = `${env.appUrl}/tasks/${row.task_id}`;
      processMentions(this.getRepo().db, String(row.tenant_id), row.comment, commentLink, String(actorId)).catch(
        (err) => logger.error({ err }, 'Failed to process task comment mentions'),
      );
    }
    return comment;
  }

  public async addComment(row: OperationDataType<'task_comments', 'insert'>) {
    return this.add(row);
  }
}
