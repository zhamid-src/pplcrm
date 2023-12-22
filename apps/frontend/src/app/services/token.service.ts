import { Injectable } from "@angular/core";

const AUTHTOKEN = "ppl-crm-auth-token";
const REFRESHTOKEN = "ppl-crm-refresh-token";

@Injectable({
  providedIn: "root",
})
export class TokenService {
  private _persistence: boolean = false;

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

  public get() {
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

  public set(auth_token: string, refresh_token: string) {
    this.setAuthToken(auth_token);
    this.setRefreshToken(refresh_token);
  }

  public setAuthToken(token: string) {
    if (this.persistence) {
      localStorage.setItem(AUTHTOKEN, token);
    } else {
      sessionStorage.setItem(AUTHTOKEN, token);
    }
  }

  public setRefreshToken(token: string) {
    if (this.persistence) {
      localStorage.setItem(REFRESHTOKEN, token);
    } else {
      sessionStorage.setItem(REFRESHTOKEN, token);
    }
  }

  private clearPersistentStorage() {
    localStorage.removeItem(AUTHTOKEN);
    localStorage.removeItem(REFRESHTOKEN);
  }

  private clearSessionStorage() {
    sessionStorage.removeItem(AUTHTOKEN);
    sessionStorage.removeItem(REFRESHTOKEN);
  }
}
