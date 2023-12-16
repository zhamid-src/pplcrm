import { Injectable, signal } from "@angular/core";
import { IAuthUser, IToken } from "@common";
import { TRPCError } from "@trpc/server";
import { TRPCService } from "./trpc.service";

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
  private _user = signal<IAuthUser | null>(null);

  public signIn(input: { email: string; password: string }) {
    return this.api.auth.signIn.mutate(input).then((token) => {
      if (token) {
        this.saveTokens(token);
      } else {
        throw new Error("Sign in failed");
      }
      return token;
    });
  }

  public signOut() {
    const apiReturn = this.api.auth.signOut.mutate();

    localStorage.removeItem("auth-token");
    localStorage.removeItem("refresh-token");

    return apiReturn;
  }

  public signUp(input: SignUpFormType) {
    return this.api.auth.signUp
      .mutate(input)
      .then((token) => this.saveTokens(token));
  }

  public user() {
    return this._user();
  }

  private async saveTokens(token: IToken | TRPCError) {
    if (!token || token instanceof TRPCError) {
      throw token;
    }

    localStorage.setItem("auth-token", token.auth_token);
    localStorage.setItem("refresh-token", token.refresh_token);

    const user = await this.api.auth.currentUser.query();
    this._user.set(user);

    return token;
  }
}
