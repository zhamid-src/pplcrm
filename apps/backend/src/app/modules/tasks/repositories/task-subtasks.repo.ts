import { BaseRepository } from '../../../lib/base.repo';

export class TaskSubtasksRepo extends BaseRepository<'task_subtasks'> {
  constructor() {
    super('task_subtasks');
  }
}

