import { UserPofiles } from '../repositories/userprofiles.repo';
import { BaseController } from './base.controller';

/**
 * Controller for managing user profiles.
 *
 * Extends the base controller to provide default CRUD operations
 * for the `profiles` table.
 */
export class UserProfilesController extends BaseController<'profiles', UserPofiles> {
  constructor() {
    super(new UserPofiles());
  }
}
