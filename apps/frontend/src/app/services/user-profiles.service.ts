import { Injectable } from '@angular/core';
import { TRPCService } from './trpc.service';

@Injectable({
  providedIn: 'root',
})
export class UserProfilesService extends TRPCService<'profiles'> {
  // #region Public Methods (2)

  public getAll() {
    return this.api.userProfiles.findAll.query();
  }

  public findOne(id: number) {
    return this.api.userProfiles.findOne.query(id);
  }
}
