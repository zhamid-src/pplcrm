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

  public user() {
    return this._user();
  }

  public resetPassword(input: { code: string; password: string }) {
    return this.api.auth.resetPassword.mutate(input);
  }

  public sendPasswordResetEmail(input: { email: string }) {
    return this.api.auth.sendPasswordResetEmail.mutate(input);
  }

  public signIn(input: { email: string; password: string }) {
    return this.api.auth.signIn.mutate(input).then((token) => {
      if (token) {
        this.updateTokens(token);
      } else {
        throw new Error("Sign in failed");
      }
      return token;
    });
  }

  public init() {
    return this.getCurrentUser();
  }

  public async signOut() {
    const apiReturn = await this.api.auth.signOut.mutate();
    this._user.set(null);
    this.tokenService.clearAll();
    this.routerService.navigate(["/signin"]);

    return apiReturn;
  }

  public signUp(input: SignUpFormType) {
    return this.api.auth.signUp
      .mutate(input)
      .then((token) => this.updateTokens(token));
  }

  private async getCurrentUser() {
    const user = await this.api.auth.currentUser.query();
    this._user.set(user);
    return user;
  }

  private async updateTokens(token: IToken | TRPCError) {
    if (!token || token instanceof TRPCError) {
      throw token;
    }

    this.tokenService.set(token.auth_token, token.refresh_token);
    this.getCurrentUser();
    return token;
  }
}
