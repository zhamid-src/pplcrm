import { Injectable } from "@angular/core";
import { IToken } from "@common";

const AUTHTOKEN = "ppl-crm-auth-token";
const REFRESHTOKEN = "ppl-crm-refresh-token";

@Injectable({
  providedIn: "root",
})
export class TokenService {
  private _persistence = false;

  constructor() {
    this.persistence = !!localStorage.getItem("pc-persistence");
  }

  public get persistence() {
    return this._persistence;
  }

  public set persistence(persistence: boolean) {
    // first clear
    if (this.persistence && !persistence) {
      this.clearPersistentStorage();
    } else if (!this.persistence && persistence) {
      this.clearSessionStorage();
    }
    this._persistence = persistence;
    localStorage.setItem("pc-persistence", persistence ? "1" : "0");
  }

  public clearAll() {
    this.clearPersistentStorage();
    this.clearSessionStorage();
  }

  public get(): IToken {
    return {
      auth_token: this.getAuthToken(),
      refresh_token: this.getRefreshToken(),
    };
  }

  public getAuthToken() {
    return this.persistence
      ? localStorage.getItem(AUTHTOKEN)
      : sessionStorage.getItem(AUTHTOKEN);
  }

  public getRefreshToken() {
    return this.persistence
      ? localStorage.getItem(REFRESHTOKEN)
      : sessionStorage.getItem(REFRESHTOKEN);
  }

  public removeAuthToken() {
    this.removeToken(AUTHTOKEN);
  }

  public removeRefreshToken() {
    this.removeToken(REFRESHTOKEN);
  }

  public set(token: IToken) {
    token.auth_token
      ? this.setAuthToken(token.auth_token)
      : this.removeAuthToken();
    token.refresh_token
      ? this.setRefreshToken(token.refresh_token)
      : this.removeRefreshToken();
  }

  public setAuthToken(token: string) {
    this.setToken(AUTHTOKEN, token);
  }

  public setRefreshToken(token: string) {
    this.setToken(REFRESHTOKEN, token);
  }

  private clearPersistentStorage() {
    localStorage.removeItem(AUTHTOKEN);
    localStorage.removeItem(REFRESHTOKEN);
  }

  private clearSessionStorage() {
    sessionStorage.removeItem(AUTHTOKEN);
    sessionStorage.removeItem(REFRESHTOKEN);
  }

  private removeToken(item: string) {
    this.persistence
      ? localStorage.removeItem(item)
      : sessionStorage.removeItem(item);
  }

  private setToken(item: string, token: string) {
    this.persistence
      ? localStorage.setItem(item, token)
      : sessionStorage.setItem(item, token);
  }
}
