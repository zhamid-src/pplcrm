import { Service } from '@angular/core';

import { RouterOutputs } from '../../../services/api/trpc-types';
import { TRPCService } from '../../../services/api/trpc-service';

/** Cross-entity duplicate-admin calls: sidebar badge, §9.3 sweep sentence/empty state, and
 * "Not duplicates" dismissal. See `apps/backend/src/app/modules/duplicates/` for the router. */
@Service()
export class DuplicatesService extends TRPCService<'potential_duplicates'> {
  public countQueue(): Promise<RouterOutputs['duplicates']['countQueue']> {
    return this.api.duplicates.countQueue.query();
  }

  public getSweepInfo(): Promise<RouterOutputs['duplicates']['getSweepInfo']> {
    return this.api.duplicates.getSweepInfo.query();
  }

  public dismissGroup(groupKey: string): Promise<RouterOutputs['duplicates']['dismissGroup']> {
    return this.api.duplicates.dismissGroup.mutate({ groupKey });
  }
}
