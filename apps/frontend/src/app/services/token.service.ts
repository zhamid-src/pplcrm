import { Injectable } from "@angular/core";

const AUTHTOKEN = "ppl-crm-auth-token";
const REFRESHTOKEN = "ppl-crm-refresh-token";

@Injectable({
  providedIn: "root",
})
export class TokenService {
  private _persistence: boolean = false;

  constructor() {
    this.persistence = !!localStorage.getItem("pplcrm-persistence");
  }

  get persistence() {
    return this._persistence;
  }
  set persistence(persistence: boolean) {
    // first clear
    if (this.persistence && !persistence) {
      this.clearPersistentStorage();
    } else if (!this.persistence && persistence) {
      this.clearSessionStorage();
    }
    this._persistence = persistence;
    localStorage.setItem("pplcrm-persistence", persistence ? "1" : "0");
  }

  public clearAll() {
    this.clearPersistentStorage();
    this.clearSessionStorage();
  }

  private clearPersistentStorage() {
    localStorage.removeItem(AUTHTOKEN);
    localStorage.removeItem(REFRESHTOKEN);
  }

  private clearSessionStorage() {
    sessionStorage.removeItem(AUTHTOKEN);
    sessionStorage.removeItem(REFRESHTOKEN);
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

  public hasAuthToken() {
    return !!this.getAuthToken();
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

  public set(auth_token: string, refresh_token: string) {
    this.setAuthToken(auth_token);
    this.setRefreshToken(refresh_token);
  }

  public get() {
    return {
      auth_token: this.getAuthToken(),
      refresh_token: this.getRefreshToken(),
    };
  }
}
