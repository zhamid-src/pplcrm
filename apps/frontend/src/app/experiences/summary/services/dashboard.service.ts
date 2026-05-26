import { Service } from '@angular/core';
import { TRPCService } from '../../../services/api/trpc-service';

@Service()
export class DashboardService extends TRPCService<any> {
  public getStats() {
    return this.api.dashboard.getStats.query();
  }
}
