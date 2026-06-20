import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { getAllOptionsType } from '../../../../../../libs/common/src';
import { ErrorService } from '../error.service';
import { TRPCClientError, TRPCLink, createTRPCClient, httpLink as trpcHttpLink, loggerLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import superjson from 'superjson';

import { get, set } from 'idb-keyval';

import { TRPCRouter } from '../../../../../backend/src/app/modules/trpc';
import { environment } from '../../../environments/environment';
import { TokenService } from './token-service';
import { refreshLink } from './trpc-refreshlink';
import { ApiError } from './api-error';

@Service()
export class TRPCService<T> {
  protected readonly errorSvc = inject(ErrorService);

  protected readonly router = inject(Router);

  protected readonly tokenService = inject(TokenService);

  protected ac = new AbortController();

  protected api: any;

  constructor() {
    this.api = createTRPCClient<TRPCRouter>({
      links: [
        loggerLink(),
        refreshLink(this.tokenService, this.router),
        errorLink(this.errorSvc),
        httpUnbatchedLink(this.tokenService),
      ],
    });
  }

  public abort() {
    this.ac.abort();
    this.ac = new AbortController(); // create a fresh controller so future calls are not auto-aborted
  }

  protected async runCachedCall(
    apiCall: Promise<Partial<T>[]>,
    apiName: string,
    options: getAllOptionsType,
    refresh: boolean,
  ) {
    const keyToHash = JSON.stringify({ apiName, ...options });
    const hashedKey = this.hash(keyToHash);
    const payload = await get(hashedKey);
    let data = payload?.expires > Date.now() ? payload.data : null;

    if (refresh || !data || data.length === 0) {
      data = await apiCall;
      await set(hashedKey, { expires: this.addDays(1), data });
    }

    return data;
  }

  private addDays(days: number) {
    const date = new Date(Date.now());
    date.setDate(date.getDate() + days);
    return date;
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return (hash >>> 0).toString(36);
  }
}

function errorLink(errorSvc: ErrorService): TRPCLink<TRPCRouter> {
  const GENERIC_LOGIN_MSG = 'Please check your email and password and try again';
  const GENERIC_INPUT_MSG = 'Please check your input and try again';

  return () =>
    ({ next, op }) =>
      observable((observer) => {
        const unsubscribe = next(op).subscribe({
          next: (value) => observer.next(value),
          error: (err) => {
            const meta = (op as unknown as { meta?: { skipErrorHandler?: boolean } }).meta;
            let finalErr: any = err;

            if (err instanceof TRPCClientError) {
              const code = err.data?.code as string | undefined;
              const path = op.path ?? '';
              const isSignIn = path === 'auth.signIn' || path.endsWith('.signIn') || path === 'signIn';

              let msg = err.message;
              if (isSignIn && (code === 'BAD_REQUEST' || code === 'UNAUTHORIZED' || code === 'NOT_FOUND')) {
                // Server formatter should already do this; this is just a client fallback
                msg = GENERIC_LOGIN_MSG;
              } else if (code === 'BAD_REQUEST') {
                const isValidationError = (err.data as any)?.isZodError;
                if (isValidationError) {
                  msg = GENERIC_INPUT_MSG;
                }
              }
              finalErr = new ApiError(msg, err);
            }

            if (!meta?.skipErrorHandler) {
              errorSvc.handle(finalErr);
            }

            observer.error(finalErr);
          },
          complete: () => observer.complete(),
        });
        return unsubscribe;
      });
}

function httpUnbatchedLink(tokenSvc: TokenService) {
  return trpcHttpLink({
    url: environment.apiUrl,
    transformer: superjson,
    headers() {
      const authToken = tokenSvc.getAuthToken();
      return authToken ? { Authorization: `Bearer ${authToken}` } : {};
    },
  });
}
