/* eslint-disable @typescript-eslint/no-unused-vars */
import { UserPofilesRepository } from '../repositories/user-profiles.repository';
import { BaseController } from './base.controller';

export class UserProfilesController extends BaseController<'profiles', UserPofilesRepository> {
  constructor() {
    super(new UserPofilesRepository());
  }
}
