import { Injectable } from '@angular/core';
import { IToken } from '@common';

/**
 * A service that manages storing, retrieving, and clearing auth tokens
 * in either sessionStorage or localStorage, depending on user preference.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private persistence = false;

  constructor() {
    this.persistence = !!localStorage.getItem('pc-persistence');
  }

  /**
   * Clears tokens from both sessionStorage and localStorage.
   */
  public clearAll(): void {
    this.clearPersistentStorage();
    this.clearSessionStorage();
  }

  /**
   * Returns both auth and refresh tokens.
   *
   * @returns An object containing both tokens.
   */
  public get(): IToken {
    return {
      auth_token: this.getAuthToken(),
      refresh_token: this.getRefreshToken(),
    };
  }

  /**
   * Gets the current auth token based on persistence mode.
   */
  public getAuthToken(): string | null {
    return this.persistence ? localStorage.getItem(AUTHTOKEN) : sessionStorage.getItem(AUTHTOKEN);
  }

  /**
   * Gets whether token persistence is enabled.
   * If `true`, tokens are stored in localStorage (persist across tabs and reloads).
   * If `false`, tokens are stored in sessionStorage (cleared when tab closes).
   */
  public getPersistence(): boolean {
    return this.persistence;
  }

  /**
   * Gets the current refresh token based on persistence mode.
   */
  public getRefreshToken(): string | null {
    return this.persistence ? localStorage.getItem(REFRESHTOKEN) : sessionStorage.getItem(REFRESHTOKEN);
  }

  /**
   * Removes the auth token from storage.
   */
  public removeAuthToken(): void {
    this.removeToken(AUTHTOKEN);
  }

  /**
   * Removes the refresh token from storage.
   */
  public removeRefreshToken(): void {
    this.removeToken(REFRESHTOKEN);
  }

  /**
   * Stores both the auth and refresh tokens.
   * Automatically removes any token that is falsy.
   *
   * @param token - Object containing auth and/or refresh tokens.
   */
  public set(token: IToken): void {
    token.auth_token ? this.setAuthToken(token.auth_token) : this.removeAuthToken();

    token.refresh_token ? this.setRefreshToken(token.refresh_token) : this.removeRefreshToken();
  }

  /**
   * Stores the auth token using the current persistence mode.
   *
   * @param token - The auth token value to store.
   */
  public setAuthToken(token: string): void {
    this.setToken(AUTHTOKEN, token);
  }

  /**
   * Sets the persistence mode for token storage.
   * If persistence changes, it clears tokens from the old storage type.
   *
   * @param persistence - `true` to use localStorage, `false` to use sessionStorage
   */
  public setPersistence(persistence: boolean) {
    if (this.getPersistence() && !persistence) {
      this.clearPersistentStorage();
    } else if (!this.getPersistence() && persistence) {
      this.clearSessionStorage();
    }
    this.persistence = persistence;
    localStorage.setItem('pc-persistence', persistence ? '1' : '0');
  }

  /**
   * Stores the refresh token using the current persistence mode.
   *
   * @param token - The refresh token value to store.
   */
  public setRefreshToken(token: string): void {
    this.setToken(REFRESHTOKEN, token);
  }

  /**
   * Removes tokens from localStorage.
   */
  private clearPersistentStorage(): void {
    localStorage.removeItem(AUTHTOKEN);
    localStorage.removeItem(REFRESHTOKEN);
  }

  /**
   * Removes tokens from sessionStorage.
   */
  private clearSessionStorage(): void {
    sessionStorage.removeItem(AUTHTOKEN);
    sessionStorage.removeItem(REFRESHTOKEN);
  }

  /**
   * Removes a specific token key from the active storage.
   *
   * @param item - The key of the token to remove.
   */
  private removeToken(item: string): void {
    this.persistence ? localStorage.removeItem(item) : sessionStorage.removeItem(item);
  }

  /**
   * Stores a token in the appropriate storage based on persistence.
   *
   * @param item - The key under which to store the token.
   * @param token - The token string to store.
   */
  private setToken(item: string, token: string): void {
    this.persistence ? localStorage.setItem(item, token) : sessionStorage.setItem(item, token);
  }
}

const AUTHTOKEN = 'ppl-crm-auth-token';
const REFRESHTOKEN = 'ppl-crm-refresh-token';
