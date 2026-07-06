import { Service } from '@angular/core';

/**
 * Holds the short-lived access token IN MEMORY only (SECURITY-REVIEW.md 2.1). The long-lived refresh
 * token is never seen by JS — it lives in an HttpOnly cookie set by the backend — so an XSS payload
 * can't exfiltrate a durable credential. On a cold page load the access token is gone; the app
 * silently re-mints one from the refresh cookie (see trpc-refreshlink `silentRefresh`).
 *
 * `persistence` is the remember-me preference only (which drives the cookie lifetime server-side);
 * it no longer controls token storage because tokens are never persisted client-side.
 */
@Service()
export class TokenService {
  private persistence = false;
  private authToken: string | null = null;

  constructor() {
    this.persistence = localStorage.getItem(PERSISTENCE_KEY) === '1';
  }

  public clearAll(): void {
    this.authToken = null;
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public getPersistence(): boolean {
    return this.persistence;
  }

  public removeAuthToken(): void {
    this.authToken = null;
  }

  /** Accepts the token-issuing response shape ({ auth_token }); the refresh token is not returned
   * to JS anymore (it's in the HttpOnly cookie). */
  public set(token: { auth_token?: string | null }): void {
    this.authToken = token.auth_token ?? null;
  }

  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  public setPersistence(persistence: boolean): void {
    this.persistence = persistence;
    localStorage.setItem(PERSISTENCE_KEY, persistence ? '1' : '0');
  }
}

const PERSISTENCE_KEY = 'pc-persistence';
