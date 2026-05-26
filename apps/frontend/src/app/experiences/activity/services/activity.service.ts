import { Injectable } from '@angular/core';
import { TRPCService } from '../../../services/api/trpc-service';

@Injectable({
  providedIn: 'root',
})
export class ActivityService extends TRPCService<any> {
  public getFeed(options?: any) {
    return this.api.activity.getFeed.query(options);
  }
}
