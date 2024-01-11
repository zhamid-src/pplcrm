/* eslint-disable @typescript-eslint/no-unused-vars */
import { UserPofilesOperator } from '../db.operators/user-profiles.operator';

export class UserProfilesHelper {
  private user = new UserPofilesOperator();

  public findOne(param: bigint) {
    return this.user.findOne(param);
  }
}
