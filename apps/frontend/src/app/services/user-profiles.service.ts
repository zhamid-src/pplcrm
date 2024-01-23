import { Injectable } from '@angular/core';
import { TRPCService } from './trpc.service';

@Injectable({
  providedIn: 'root',
})
export class UserProfilesService extends TRPCService<'profiles'> {}
