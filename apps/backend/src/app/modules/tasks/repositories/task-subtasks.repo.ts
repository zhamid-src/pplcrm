import type { Transaction } from 'kysely';

import { BaseRepository } from '../../../lib/base.repo';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class TaskSubtasksRepo extends BaseRepository<'task_subtasks'> {
  constructor() {
    super('task_subtasks');
  }

  /**
   * Ordered read for the task detail page — `position` asc is the manual drag
   * order; `created_at`/`id` are the deterministic tiebreak so brand-new subtasks
   * (all `position` 0 by default) still fall in a stable, oldest-first order.
   */
  public getByTaskIdOrdered(tenant_id: string, task_id: string, trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('task_id', '=', task_id)
      .orderBy('position', 'asc')
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .execute();
  }
}
