import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { Routers } from "APPS/backend/src/app/app.router";

export class TRPCService {
  protected api;

  constructor() {
    this.api = createTRPCProxyClient<Routers>({
      links: [
        httpBatchLink({
          url: "http://localhost:3000",
        }),
      ],
    });
  }
}
