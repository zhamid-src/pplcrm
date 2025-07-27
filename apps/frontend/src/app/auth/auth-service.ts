import { Injectable, signal } from '@angular/core';
import { IAuthUser, IToken, signInInputType, signUpInputType } from '@common';
import { TRPCError } from '@trpc/server';

import { TRPCService } from '../backend-svc/trpc-service';

/**
 * Authentication service responsible for managing the user's authentication state,
 * performing sign-in/sign-up/sign-out operations, and interacting with the backend via tRPC.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService extends TRPCService<'authusers'> {
  private _user = signal<IAuthUser | null>(null);

  /**
   * Initializes the auth service by fetching the current user from the backend.
   * Useful to restore session on page reload.
   */
  public init() {
    return this.getCurrentUser();
  }

  /**
   * Resets the user's password using a verification code and new password.
   *
   * @param input - Object containing the reset `code` and new `password`.
   */
  public resetPassword(input: { code: string; password: string }) {
    return this.api.auth.resetPassword.mutate(input);
  }

  /**
   * Sends a password reset email to the provided address.
   *
   * @param input - Object with the target `email`.
   */
  public sendPasswordResetEmail(input: { email: string }) {
    return this.api.auth.sendPasswordResetEmail.mutate(input);
  }

  /**
   * Signs the user in using provided credentials and stores the received token.
   *
   * @param input - The sign-in credentials.
   * @returns The authenticated user after token storage and user fetch.
   * @throws `TRPCError` if authentication fails.
   */
  public async signIn(input: signInInputType) {
    const token = await this.api.auth.signIn.mutate(input);
    return this.updateTokensAndGetCurrentUser(token);
  }

  /**
   * Signs the user out, clears tokens, resets local auth state, and navigates to `/signin`.
   *
   * @returns API response from the sign-out mutation, or `null` if failed.
   */
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

  /**
   * Registers a new user, stores tokens, and fetches the user profile.
   *
   * @param input - The sign-up form input.
   * @returns The authenticated user after token storage and user fetch.
   * @throws `TRPCError` if sign-up fails.
   */
  public async signUp(input: signUpInputType) {
    const token = await this.api.auth.signUp.mutate(input);
    return this.updateTokensAndGetCurrentUser(token);
  }

  /**
   * Returns the currently authenticated user (from local state).
   *
   * @returns The authenticated user or `null` if not signed in.
   */
  public user(): IAuthUser | null {
    return this._user();
  }

  /**
   * Fetches the current authenticated user from the backend and updates local state.
   *
   * @returns The user object if authenticated, otherwise `null`.
   */
  private async getCurrentUser() {
    const user = (await this.api.auth.currentUser.query().catch(() => null)) as IAuthUser;
    if (user) this._user.set(user);
    return user;
  }

  /**
   * Updates token storage and then fetches and stores the authenticated user's data.
   *
   * @param token - The token returned from sign-in or sign-up.
   * @returns The user object if successful.
   * @throws `TRPCError` if token is invalid.
   */
  private async updateTokensAndGetCurrentUser(token: IToken | TRPCError) {
    if (!token || token instanceof TRPCError) {
      throw token;
    }
    this.tokenService.set(token);
    return this.getCurrentUser();
  }
}
