import { inject, Service } from '@angular/core';
import { IAuthUser, UpdateAuthUserType } from '../../../../../libs/common/src';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth-service';
import { TRPCService } from './api/trpc-service';

@Service()
export class UserService extends TRPCService<any> {
  private readonly authService = inject(AuthService);

  public getUsers() {
    return this.api.users.getUsers.query() as Promise<IAuthUser[]>;
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
        first_name: updated.first_name ?? current.first_name,
        ...(updated as any),
      });
    }
    return updated;
  }

  public resolveAvatarUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    let resolved = url;
    if (url.startsWith('/') && !url.startsWith('//')) {
      resolved = environment.apiUrl + url;
    }
    if (!resolved.includes('token=')) {
      const token = this.tokenService.getAuthToken();
      if (token) {
        const separator = resolved.includes('?') ? '&' : '?';
        resolved = `${resolved}${separator}token=${encodeURIComponent(token)}`;
      }
    }
    return resolved;
  }
}
