import { Service } from '@angular/core';
import { TRPCService } from './trpc-service';

@Service()
export class NotificationsService extends TRPCService<'notifications'> {
  public getLatest(options?: { limit?: number; offset?: number }) {
    return this.api.notifications.getLatest.query(options);
  }

  public getUnreadCount() {
    return this.api.notifications.getUnreadCount.query();
  }

  public markAllRead() {
    return this.api.notifications.markAllRead.mutate();
  }

  public markRead(id: string) {
    return this.api.notifications.markRead.mutate(id);
  }
}
