import { inject, Service } from '@angular/core';
import { IAuthUser, UpdateAuthUserType } from '../../../../../libs/common/src';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth-service';
import { TRPCService } from './api/trpc-service';

@Service()
export class UserService extends TRPCService<any> {
  private readonly authService = inject(AuthService);

  public getUsers() {
    return this.api.users.getUsers.query() as unknown as Promise<IAuthUser[]>;
  }

  public getProfileById(id: string) {
    return this.api.users.getProfileById.query(id);
  }

  public async updateUserProfile(id: string, data: UpdateAuthUserType) {
    const updated = await this.api.users.updateUserProfile.mutate({ id, data });
    // If the updated user is the current user, update our local signal
    const current = this.authService.getUser();
    if (current && current.id === id) {
      this.authService.getUserSignal().set({
        ...current,
        ...updated,
        first_name: (updated.first_name as string | undefined) ?? current.first_name,
      });
    }
    return updated;
  }

  public resolveAvatarUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    // Backend avatar URLs arrive pre-signed (short-lived, single-file scope),
    // so no session token is appended — tokens in URLs leak into history/logs.
    if (url.startsWith('/') && !url.startsWith('//')) {
      return environment.apiUrl + url;
    }
    return url;
  }
}
