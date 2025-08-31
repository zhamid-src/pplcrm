import { BaseRepository } from '../../../lib/base.repo';

export class TasksRepo extends BaseRepository<'tasks'> {
  constructor() {
    super('tasks');
  }
}

