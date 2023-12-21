import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CacheService<T> {
  private cache: Record<string, Observable<Partial<T>[]>> = {};
  constructor() {}

  public get(key: string) {
    return this.cache[key];
  }

  public has(key: string) {
    return !!this.cache[key];
  }

  public set(key: string, value: Observable<Partial<T>[]>) {
    this.cache[key] = value;
  }

  public clear() {
    this.cache = {};
  }

  public clearKey(key: string) {
    delete this.cache[key];
  }

  public clearKeys(keys: string[]) {
    keys.forEach((key) => this.clearKey(key));
  }

  public clearAllExcept(keys: string[]) {
    Object.keys(this.cache).forEach((key) => {
      if (!keys.includes(key)) {
        this.clearKey(key);
      }
    });
  }
}
