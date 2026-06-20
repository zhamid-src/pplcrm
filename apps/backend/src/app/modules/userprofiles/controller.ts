import { UserProfiles } from './repositories/userprofiles.repo';
import { BaseController } from '../../lib/base.controller';

export class UserProfilesController extends BaseController<'profiles', UserProfiles> {
  constructor() {
    super(new UserProfiles());
  }
}
