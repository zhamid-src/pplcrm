import { BaseRepository } from '../../../lib/base.repo';

export class TaskAttachmentsRepo extends BaseRepository<'task_attachments'> {
  constructor() {
    super('task_attachments');
  }
}

