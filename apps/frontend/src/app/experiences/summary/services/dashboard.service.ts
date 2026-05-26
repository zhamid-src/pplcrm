import { Injectable } from '@angular/core';
import { TRPCService } from '../../../services/api/trpc-service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService extends TRPCService<any> {
  public getStats() {
    return this.api.dashboard.getStats.query();
  }
}
