import { Transaction } from 'kysely';
import type { OperationDataType, Models } from 'common/src/lib/kysely.models';
import { BaseController } from '../../lib/base.controller';
import { TaskAttachmentsRepo } from './repositories/task-attachments.repo';

export class TaskAttachmentsController extends BaseController<'task_attachments', TaskAttachmentsRepo> {
  constructor() {
    super(new TaskAttachmentsRepo());
  }

  public getByTaskId(input: { tenant_id: string; task_id: string }) {
    // getManyBy is protected in repo; expose via controller method on repo instance
    return (this as any).getRepo().getManyBy('task_id', { tenant_id: input.tenant_id, value: input.task_id });
  }

  public override async add(row: OperationDataType<'task_attachments', 'insert'>, trx?: Transaction<Models>) {
    const attachment = await super.add(row, trx);
    if (attachment && row.task_id && row.tenant_id && row.createdby_id) {
      await this.userActivity.log({
        tenant_id: String(row.tenant_id),
        user_id: String(row.createdby_id),
        activity: 'update',
        entity: 'tasks',
        entity_id: String(row.task_id),
        quantity: 1,
        metadata: { action: 'add_attachment', filename: row.filename },
      }, trx);
    }
    return attachment;
  }
}

