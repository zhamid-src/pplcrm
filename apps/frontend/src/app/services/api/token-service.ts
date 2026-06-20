import { Service } from '@angular/core';
import { IToken } from '../../../../../../libs/common/src';

@Service()
export class TokenService {
  private persistence = false;

  constructor() {
    this.persistence = !!localStorage.getItem('pc-persistence');
  }

  public clearAll(): void {
    this.clearPersistentStorage();
    this.clearSessionStorage();
  }

  public get(): IToken {
    return {
      auth_token: this.getAuthToken(),
      refresh_token: this.getRefreshToken(),
    };
  }

  public getAuthToken(): string | null {
    return this.persistence ? localStorage.getItem(AUTHTOKEN) : sessionStorage.getItem(AUTHTOKEN);
  }

  public getPersistence(): boolean {
    return this.persistence;
  }

  public getRefreshToken(): string | null {
    return this.persistence ? localStorage.getItem(REFRESHTOKEN) : sessionStorage.getItem(REFRESHTOKEN);
  }

  public removeAuthToken(): void {
    this.removeToken(AUTHTOKEN);
  }

  public removeRefreshToken(): void {
    this.removeToken(REFRESHTOKEN);
  }

  public set(token: IToken): void {
    if (token.auth_token) {
      this.setAuthToken(token.auth_token);
    } else {
      this.removeAuthToken();
    }

    if (token.refresh_token) {
      this.setRefreshToken(token.refresh_token);
    } else {
      this.removeRefreshToken();
    }
  }

  public setAuthToken(token: string): void {
    this.setToken(AUTHTOKEN, token);
  }

  public setPersistence(persistence: boolean) {
    if (this.getPersistence() && !persistence) {
      this.clearPersistentStorage();
    } else if (!this.getPersistence() && persistence) {
      this.clearSessionStorage();
    }
    this.persistence = persistence;
    localStorage.setItem('pc-persistence', persistence ? '1' : '0');
  }

  public setRefreshToken(token: string): void {
    this.setToken(REFRESHTOKEN, token);
  }

  private clearPersistentStorage(): void {
    localStorage.removeItem(AUTHTOKEN);
    localStorage.removeItem(REFRESHTOKEN);
  }

  private clearSessionStorage(): void {
    sessionStorage.removeItem(AUTHTOKEN);
    sessionStorage.removeItem(REFRESHTOKEN);
  }

  private removeToken(item: string): void {
    if (this.persistence) {
      localStorage.removeItem(item);
    } else {
      sessionStorage.removeItem(item);
    }
  }

  private setToken(item: string, token: string): void {
    if (this.persistence) {
      localStorage.setItem(item, token);
    } else {
      sessionStorage.setItem(item, token);
    }
  }
}

const AUTHTOKEN = 'ppl-crm-auth-token';
const REFRESHTOKEN = 'ppl-crm-refresh-token';
