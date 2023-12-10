import { Injectable, signal } from "@angular/core";
import * as common from "@common";
import { TRPCService } from "./trpc.service.js";

// TODO: zee - find a way to share these, these are also
// defined in auth.router.ts

export type SignUpFormType = {
  organization: string;
  email: string;
  password: string;
  first_name: string;
  middle_names: string | null;
  last_name: string | null;
  terms: string | null;
};

@Injectable({
  providedIn: "root",
})
export class AuthService extends TRPCService {
  // #region Properties (1)

  private static _user = signal<unknown | null>(null);

  // #endregion Properties (1)

  // #region Public Static Accessors (1)

  public static get user() {
    return this._user();
  }

  // #endregion Public Static Accessors (1)

  // #region Public Methods (3)

  public signIn(input: { email: string; password: string }) {
    return this.api.auth.signIn
      .mutate(input)
      .then((payload: Partial<common.IAuthUser>) => {
        AuthService._user.set(payload?.user);
        return payload;
      })
      .catch(() => {
        AuthService._user.set(null);
        return { error: common.AuthErrors.BadLogin } as common.IAuthUser;
      });
  }

  public newPassword(password: string, refresh_token: string) {
    return this.api.auth.newPassword.mutate({ password, refresh_token });
  }

  public resetPassword(email: string) {
    return this.api.auth.resetPassword.mutate({ email });
  }

  public signOut() {
    return this.api.auth.signOut
      .mutate()
      .finally(() => AuthService._user.set(null));
  }

  public signUp(input: SignUpFormType) {
    return this.api.auth.signUp
      .mutate(input)
      .then((payload: Partial<common.IAuthUser>) => {
        AuthService._user.set(payload?.user);
        if (payload.error) {
          throw payload.error;
        }
      })
      .catch((err) => {
        AuthService._user.set(null);
        return { error: err || common.AuthErrors.BadLogin } as common.IAuthUser;
      });
  }

  // #endregion Public Methods (3)
}
