import { Injectable } from '@angular/core';
import { TRPCService } from './trpc.service';

@Injectable({
  providedIn: 'root',
})
export class UserProfilesService extends TRPCService<'profiles'> {
  // #region Public Methods (2)

  public findOne(id: bigint) {
    return this.api.userProfiles.findOne.query(id);
  }
}
