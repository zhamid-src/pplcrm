import { Service } from '@angular/core';
import { TRPCService } from '../../../services/api/trpc-service';

@Service()
export class DashboardService extends TRPCService<any> {
  public getStats() {
    return this.api.dashboard.getStats.query();
  }

  public getBreachedEmails(page: number, limit: number) {
    return this.api.dashboard.getBreachedEmails.query({ page, limit });
  }

  public getBreachedTasks(page: number, limit: number) {
    return this.api.dashboard.getBreachedTasks.query({ page, limit });
  }
}
