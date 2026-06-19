import { BaseController } from '../../lib/base.controller';
import { NotificationsRepo } from './repositories/notifications.repo';
import type { IAuthKeyPayload } from '../../../../../../libs/common/src/lib/auth';

export class NotificationsController extends BaseController<'notifications', NotificationsRepo> {
  constructor() {
    super(new NotificationsRepo());
  }

  public async getLatest(auth: IAuthKeyPayload, limit?: number, offset?: number) {
    return this.getRepo().getLatestForUser(auth.tenant_id, auth.user_id, limit, offset);
  }

  public async getUnreadCount(auth: IAuthKeyPayload) {
    return this.getRepo().getUnreadCount(auth.tenant_id, auth.user_id);
  }

  public async markAllAsRead(auth: IAuthKeyPayload) {
    return this.getRepo().markAllRead(auth.tenant_id, auth.user_id);
  }

  public async markRead(id: string, auth: IAuthKeyPayload) {
    return this.update({
      tenant_id: auth.tenant_id,
      id,
      row: { read: true } as any,
    });
  }
}
