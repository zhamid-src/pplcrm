/* eslint-disable @typescript-eslint/no-unused-vars */
import { UserPofilesOperator } from '../db.operators/user-profiles.operator';
import { BaseController } from './base.controller';

export class UserProfilesController extends BaseController<'profiles', UserPofilesOperator> {
  constructor() {
    super(new UserPofilesOperator());
  }
}
