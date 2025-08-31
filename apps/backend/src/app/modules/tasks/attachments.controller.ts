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
}

