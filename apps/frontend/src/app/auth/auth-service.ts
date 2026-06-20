import { signal, Service } from '@angular/core';
import { IAuthUser, IToken, signInInputType, signUpInputType } from '../../../../../libs/common/src';
import { TRPCService } from '../services/api/trpc-service';
import { TRPCError } from '@trpc/server';

@Service()
export class AuthService extends TRPCService<'authusers'> {
  private user = signal<IAuthUser | null>(null);

  public async getCurrentUser() {
    const user = (await this.api.auth.currentUser.query().catch(() => null)) as IAuthUser;
    if (user) this.user.set(user);
    return user;
  }

  public getUser(): IAuthUser | null {
    return this.user();
  }

  public getUserSignal() {
    return this.user;
  }

  public init() {
    return this.getCurrentUser();
  }

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

  public async cancelEmailChange() {
    const response = await this.api.auth.cancelEmailChange.mutate();
    await this.getCurrentUser();
    return response;
  }

  public resetPassword(input: { code: string; password: string }) {
    return this.api.auth.resetPassword.mutate(input);
  }

  public sendPasswordResetEmail(input: { email: string }) {
    return this.api.auth.sendPasswordResetEmail.mutate(input);
  }

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

  public async verify2FA(input: { email: string; code: string }) {
    const token = await (this.api.auth.verify2FA.mutate as unknown as (input: any, opts: any) => Promise<any>)(input, {
      meta: { skipErrorHandler: true },
    });
    return this.updateTokensAndGetCurrentUser(token);
  }

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

  private async updateTokensAndGetCurrentUser(token: IToken | TRPCError) {
    if (!token || token instanceof TRPCError) {
      throw token;
    }
    this.tokenService.set(token);
    return this.getCurrentUser();
  }
}
