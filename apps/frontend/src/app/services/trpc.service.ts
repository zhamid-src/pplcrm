import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import { Routers } from "APPS/backend/src/app/app.router";

export class TRPCService {
  protected api;

  constructor() {
    this.api = createTRPCProxyClient<Routers>({
      links: [
        loggerLink(),
        httpBatchLink({
          url: "http://localhost:3000",
          headers() {
            return localStorage.getItem("auth-token")
              ? {
                  Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
                }
              : {};
          },
        }),
      ],
    });
  }
}
