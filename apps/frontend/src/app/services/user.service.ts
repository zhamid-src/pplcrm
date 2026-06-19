import { inject, Service } from '@angular/core';
import { environment } from '../../environments/environment';
import { TokenService } from './api/token-service';

@Service()
export class UserService {
  private readonly tokenService = inject(TokenService);

  /**
   * Resolves a relative or absolute avatar URL with the backend API URL and
   * appends the current auth token for authentication.
   */
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
