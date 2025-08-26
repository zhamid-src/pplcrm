import { IAuthKeyPayload } from '@common';

import { SettingsRepo } from './repositories/settings.repo';
import { BaseController } from '../../lib/base.controller';

/**
 * Controller for managing settings
 *
 * Extends the base controller to provide default CRUD operations
 * for the `settings` table.
 */
export class SettingsController extends BaseController<'settings', SettingsRepo> {
  constructor() {
    super(new SettingsRepo());
  }

  public getCurrentCampaignId(auth: IAuthKeyPayload) {
    return this.getRepo().getByKey({
      tenant_id: auth.tenant_id,
      key: 'current_campaign',
    });
  }
}
