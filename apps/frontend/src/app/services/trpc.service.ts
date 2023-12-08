import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { Routers } from "APPS/backend/src/app/app.router";

export class TRPCService {
  // #region Properties (1)

  protected api;

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor() {
    this.api = createTRPCProxyClient<Routers>({
      links: [
        httpBatchLink({
          url: "http://localhost:3000",
        }),
      ],
    });
  }

  // #endregion Constructors (1)
}
