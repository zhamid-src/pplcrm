import { BaseRepository } from '../../../lib/base.repo';

export class TaskCommentsRepo extends BaseRepository<'task_comments'> {
  constructor() {
    super('task_comments');
  }
}

