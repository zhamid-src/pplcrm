/**
 * @fileoverview Authentication service for managing user authentication state and operations.
 * Provides comprehensive authentication functionality including sign-in, sign-up, password reset,
 * and session management through tRPC communication with the backend.
 */
import { signal, Service } from '@angular/core';
import { IAuthUser, IToken, signInInputType, signUpInputType } from '../../../../../libs/common/src';
import { TRPCService } from '../services/api/trpc-service';
import { TRPCError } from '@trpc/server';

/**
 * Authentication service responsible for managing the user's authentication state.
 *
 * This service provides a comprehensive authentication system that handles:
 * - User sign-in and sign-up operations
 * - Password reset functionality
 * - Session management and token handling
 * - User state persistence across page reloads
 * - Secure communication with backend via tRPC
 *
 * The service maintains reactive user state using Angular signals and automatically
 * handles token storage and retrieval through the TokenService.
 *
 * @example
 * ```typescript
 * constructor(private authService: AuthService) {}
 *
 * async login() {
 *   try {
 *     const user = await this.authService.signIn({ email, password });
 *     console.log('Logged in as:', user.email);
 *   } catch (error) {
 *     console.error('Login failed:', error);
 *   }
 * }
 * ```
 */
@Service()
export class AuthService extends TRPCService<'authusers'> {
  /** Reactive signal holding the currently authenticated user state */
  private user = signal<IAuthUser | null>(null);

  /**
   * Fetches the current authenticated user from the backend and updates local state.
   *
   * @returns The user object if authenticated, otherwise `null`.
   */
  public async getCurrentUser() {
    const user = (await this.api.auth.currentUser.query().catch(() => null)) as IAuthUser;
    if (user) this.user.set(user);
    return user;
  }

  /**
   * Returns the currently authenticated user (from local state).
   *
   * @returns The authenticated user or `null` if not signed in.
   */
  public getUser(): IAuthUser | null {
    return this.user();
  }

  public getUserSignal() {
    return this.user;
  }

  /**
   * Initializes the auth service by fetching the current user from the backend.
   * Useful to restore session on page reload.
   */
  public init() {
    return this.getCurrentUser();
  }

  /**
   * Upload a new profile picture for the current user.
   * Converts the File to base64 and sends via tRPC mutation.
   */
  public async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = (await this.api.auth.uploadAvatar.mutate({
      dataBase64,
      mimeType: file.type as any,
      filename: file.name,
    })) as { avatar_url: string };

    const current = this.user();
    if (current) {
      this.user.set({
        ...current,
        avatar_url: res.avatar_url,
      });
    }

    return res;
  }

  /**
   * Remove the current user's profile picture.
   */
  public async deleteAvatar(): Promise<{ success: boolean }> {
    const res = (await this.api.auth.deleteAvatar.mutate()) as { success: boolean };

    const current = this.user();
    if (current) {
      this.user.set({
        ...current,
        avatar_url: null,
      });
    }

    return res;
  }

  /**
   * Cancels a pending email change and reverts to previous email and role.
   */
  public async cancelEmailChange() {
    const response = await this.api.auth.cancelEmailChange.mutate();
    await this.getCurrentUser();
    return response;
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
   * @returns The authenticated user after token storage and user fetch, or a 2FA requirement indicator.
   * @throws `TRPCError` if authentication fails.
   */
  public async signIn(
    input: signInInputType,
  ): Promise<{ requires2FA: boolean; email?: string; user?: IAuthUser | null }> {
    const response = await (this.api.auth.signIn.mutate as unknown as (input: any, opts: any) => Promise<any>)(input, {
      meta: { skipErrorHandler: true },
    });

    if (response && 'requires2FA' in response && response.requires2FA) {
      return { requires2FA: true, email: response.email };
    }

    const user = await this.updateTokensAndGetCurrentUser(response);
    return { requires2FA: false, user };
  }

  /**
   * Verifies the 2FA code and stores the received token.
   *
   * @param input - The verification credentials (email and code).
   * @returns The authenticated user after token storage and user fetch.
   */
  public async verify2FA(input: { email: string; code: string }) {
    const token = await (this.api.auth.verify2FA.mutate as unknown as (input: any, opts: any) => Promise<any>)(input, {
      meta: { skipErrorHandler: true },
    });
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

    this.user.set(null);
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

  public verifyEmail(input: { code: string }): Promise<{ success: boolean }> {
    return this.api.auth.verifyEmail.mutate(input) as Promise<{ success: boolean }>;
  }

  public resendVerificationEmail(email: string): Promise<{ success: boolean }> {
    return this.api.auth.resendVerificationEmail.mutate({ email }) as Promise<{ success: boolean }>;
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
