import { BaseRepository } from '../../../lib/base.repo';

export class WorkflowStepsRepo extends BaseRepository<'workflow_steps'> {
  constructor() {
    super('workflow_steps');
  }
}
