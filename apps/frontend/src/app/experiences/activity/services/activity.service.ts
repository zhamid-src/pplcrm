import { Service } from '@angular/core';
import type { InteractionType } from '@common';
import { TRPCService } from '../../../services/api/trpc-service';

@Service()
export class ActivityService extends TRPCService<any> {
  public getFeed(options?: any) {
    return this.api.activity.getFeed.query(options);
  }

  public getActivities(entity: string, entityId: string, options?: { startRow?: number; endRow?: number }) {
    return this.api.activity.getActivities.query({ entity, entityId, ...options });
  }

  public exportCsv(input: any) {
    return this.api.activity.exportCsv.mutate(input);
  }

  /** Record a human-authored interaction against a record (Log an interaction). */
  public logInteraction(input: {
    entity: string;
    entityId: string;
    type: InteractionType;
    note?: string;
    occurredAt?: Date;
  }) {
    return this.api.activity.logInteraction.mutate(input);
  }
}
