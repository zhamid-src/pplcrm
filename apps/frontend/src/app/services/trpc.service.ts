import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { getAllOptionsType } from "@common";
import { refreshTokenLink } from "@pyncz/trpc-refresh-token-link";
import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import { Routers } from "APPS/backend/src/app/app.router";
import { get, set } from "idb-keyval";
import { TokenService } from "./token.service";

@Injectable({
  providedIn: "root",
})
export class TRPCService<T> {
  protected api;
  protected ac = new AbortController();

  constructor(
    protected tokenService: TokenService,
    protected routerService: Router,
  ) {
    const token = this.tokenService;
    this.api = createTRPCProxyClient<Routers>({
      links: [
        loggerLink(),
        refreshTokenLink({
          // Get locally stored refresh token
          getRefreshToken: () => {
            return this.tokenService.getRefreshToken() as string | undefined;
          },

          // Fetch a new JWT pair by refresh token from your API
          fetchJwtPairByRefreshToken: async (refreshToken) => {
            const auth_token = this.tokenService.getAuthToken() || "";
            const payload = await trpcRetryClient.auth.renewAuthToken.mutate({
              auth_token,
              refresh_token: refreshToken,
            });

            return {
              access: payload.auth_token,
              refresh: payload.refresh_token,
            };
          },

          // Callback on JWT pair is successfully fetched with `fetchJwtPairByRefreshToken`
          onJwtPairFetched: (payload) => {
            console.log(payload);
            this.tokenService.set(payload.access, payload.refresh);
          },

          // optional: Callback on JWT refresh request is failed
          onRefreshFailed: () => {
            // Probably you would like to remove stored jwt and log out the user here
            this.tokenService.clearAll();
          },

          // optional: Callback on a request is failed with UNAUTHORIZED code,
          // before the refresh flow is started
          onUnauthorized: () => {
            // Uh oh, just got 401!
          },
        }),
        httpBatchLink({
          url: "http://localhost:3000",
          headers() {
            const authToken = token.getAuthToken();
            return authToken
              ? {
                  Authorization: `Bearer ${authToken}`,
                }
              : {};
          },
        }),
      ],
    });
  }
  public abort() {
    this.ac.abort();
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

    return this.get(cacheKey).then((cachedResult) => {
      if (refresh || !cachedResult || cachedResult.length === 0) {
        return apiCall.then((data: Partial<T>[]) => {
          return this.set(cacheKey, data).then(() => data);
        });
      }

      return cachedResult;
    });
  }

  private get(key: string) {
    return get(key);
  }

  private set(key: string, data: Partial<T>[]) {
    return set(key, data);
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

// This is a proxy client that skips all the hooks and stuff
// We use it to refresh the auth token
const trpcRetryClient = createTRPCProxyClient<Routers>({
  links: [
    httpBatchLink({
      url: `http://localhost:3000`,
    }),
  ],
});
