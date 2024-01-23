/* eslint-disable @typescript-eslint/no-unused-vars */
import { UserPofiles } from '../repositories/userprofiles.repository';
import { BaseController } from './base.controller';

export class UserProfilesController extends BaseController<'profiles', UserPofiles> {
  constructor() {
    super(new UserPofiles());
  }
}
