import { UserPofiles } from '../repositories/userprofiles.repo';
import { BaseController } from './base.controller';

export class UserProfilesController extends BaseController<'profiles', UserPofiles> {
  constructor() {
    super(new UserPofiles());
  }
}
