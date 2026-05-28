import { BaseController } from '../../lib/base.controller';
import { UserActivityRepo } from '../../lib/user-activity.repo';
import type { IAuthKeyPayload } from 'common/src/lib/auth';

export class ActivityController extends BaseController<'user_activity', UserActivityRepo> {
  constructor() {
    super(new UserActivityRepo());
  }

  public async getFeed(auth: IAuthKeyPayload, options?: any) {
    return this.getRepo().getAllWithUser(auth.tenant_id, options || {});
  }

  public async getActivities(tenant_id: string, entity: string, entityId: string) {
    return this.getRepo().getForEntity(tenant_id, entity, entityId);
  }
}
