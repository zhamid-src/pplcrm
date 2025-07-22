import { Injectable, signal } from '@angular/core';
import { IAuthUser, IToken, signInInputType, signUpInputType } from '@common';
import { TRPCError } from '@trpc/server';
import { TRPCService } from '../data/trpc-service';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends TRPCService<'authusers'> {
  private _user = signal<IAuthUser | null>(null);

  public init() {
    return this.getCurrentUser();
  }

  public resetPassword(input: { code: string; password: string }) {
    return this.api.auth.resetPassword.mutate(input);
  }

  public sendPasswordResetEmail(input: { email: string }) {
    return this.api.auth.sendPasswordResetEmail.mutate(input);
  }

  public async signIn(input: signInInputType) {
    const token = await this.api.auth.signIn.mutate(input);
    return this.updateTokensAndGetCurrentUser(token);
  }

  public async signOut() {
    let apiReturn = null;
    try {
      apiReturn = await this.api.auth.signOut.mutate();
    } catch (error) {
      console.error('Error during sign out:', error);
    }

    this._user.set(null);
    this.tokenService.clearAll();
    this.router.navigate(['/signin']);

    return apiReturn;
  }

  public async signUp(input: signUpInputType) {
    const token = await this.api.auth.signUp.mutate(input);
    return this.updateTokensAndGetCurrentUser(token);
  }

  public user(): IAuthUser | null {
    return this._user();
  }

  private async getCurrentUser() {
    const user = (await this.api.auth.currentUser.query().catch(() => null)) as IAuthUser;
    if (user) this._user.set(user);
    return user;
  }

  private async updateTokensAndGetCurrentUser(token: IToken | TRPCError) {
    if (!token || token instanceof TRPCError) {
      throw token;
    }
    this.tokenService.set(token);
    return this.getCurrentUser();
  }
}
