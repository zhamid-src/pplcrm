import { Injectable, signal } from "@angular/core";

import { from } from "rxjs";
import { TRPCService } from "./trpc.service.js";

// TODO: zee - find a way to share these, these are also
// defined in auth.router.ts
interface IAuthUser {
  // #region Properties (3)

  error: AuthErrors | null;
  session: unknown | null;
  user: unknown | null;

  // #endregion Properties (3)
}

enum AuthErrors {
  BadLogin = 1,
  EmailNotConfirmed,
  InvalidRefreshToken,
  AdminTokenRequired,
  MissingInformation,
  UserAlreadyRegistered,
  BadPassword,
  Unknown,
}

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
      .then((payload: Partial<IAuthUser>) => {
        AuthService._user.set(payload?.user);
        return payload;
      })
      .catch(() => {
        AuthService._user.set(null);
        return { error: AuthErrors.BadLogin } as IAuthUser;
      });
  }

  public signOut() {
    return from(
      this.api.auth.signOut.mutate().finally(() => AuthService._user.set(null)),
    );
  }

  public signUp(input: SignUpFormType) {
    return this.api.auth.signUp
      .mutate(input)
      .then((payload: Partial<IAuthUser>) => {
        AuthService._user.set(payload?.user);
        if (payload.error) {
          throw payload.error;
        }
      })
      .catch((err) => {
        AuthService._user.set(null);
        return { error: err || AuthErrors.BadLogin } as IAuthUser;
      });
  }

  // #endregion Public Methods (3)
}
