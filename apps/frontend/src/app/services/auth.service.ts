import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { TRPCService } from './trpc.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends TRPCService {
  private static _user: any;

  public static get user() {
    return this._user;
  }

  public signUp(input: { email: string; password: string }) {
    return from(
      this.api.auth.signUp
        .mutate(input)
        .then((user) => (AuthService._user = user))
        .catch(() => (AuthService._user = null))
    );
  }

  public signIn(input: { email: string; password: string }) {
    return from(
      this.api.auth.signIn
        .mutate(input)
        .then((user) => (AuthService._user = user))
        .catch(() => (AuthService._user = null))
    );
  }

  public signOut() {
    return from(
      this.api.auth.signOut.mutate().finally(() => (AuthService._user = null))
    );
  }
}
