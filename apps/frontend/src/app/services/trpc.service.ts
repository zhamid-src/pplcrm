import { Injectable } from "@angular/core";
import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import { Routers } from "APPS/backend/src/app/app.router";
import { TokenService } from "./token.service";

@Injectable({
  providedIn: "root",
})
export class TRPCService {
  protected api;

  constructor(protected tokenService: TokenService) {
    const token = this.tokenService;
    this.api = createTRPCProxyClient<Routers>({
      links: [
        loggerLink(),
        httpBatchLink({
          url: "http://localhost:3000",
          headers() {
            return token.hasAuthToken()
              ? {
                  Authorization: `Bearer ${token.getAuthToken()}`,
                }
              : {};
          },
        }),
      ],
    });
  }
}
