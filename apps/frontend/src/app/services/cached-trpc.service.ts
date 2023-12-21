import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { getAllOptionsType } from "@common";
import { get, set } from "idb-keyval";
import { TokenService } from "./token.service";
import { TRPCService } from "./trpc.service";

// TODO:
// 1. add expiry to cache
// 2. have some clearing cache strategy
@Injectable({
  providedIn: "root",
})
export class CachedTRPCService<T> extends TRPCService {
  constructor(
    protected override tokenService: TokenService,
    protected override routerService: Router,
  ) {
    super(tokenService, routerService);
  }

  protected runCachedCall(
    apiCall: Promise<Partial<T>[]>,
    apiName: string,
    options: getAllOptionsType,
    refresh: boolean,
  ) {
    // Create a cache key from the api name and the options
    const cacheKey = this.hash(
      JSON.stringify({
        apiName,
        ...options,
      }),
    );

    return get(cacheKey).then((cachedResult) => {
      if (refresh || cachedResult.length === 0) {
        return apiCall.then((data: Partial<T>[]) => {
          return set(cacheKey, data).then(() => data);
        });
      }

      return cachedResult;
    });
  }

  // The hash isn't secure, but it's good enough for our purposes
  // It allows us to not use the entire stringified json as the key
  private hash(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash &= hash; // Convert to 32bit integer
    }
    return (hash >>> 0).toString(36);
  }
}
