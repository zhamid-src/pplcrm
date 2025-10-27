import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { getAllOptionsType } from '@common';
import { ErrorService } from '../error.service';
import { TRPCClientError, TRPCLink, createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';

import { get, set } from 'idb-keyval';

import { TRPCRouter } from '../../../../../backend/src/app/modules/trpc';
import { environment } from '../../../environments/environment';
import { TokenService } from './token-service';
import { refreshLink } from './trpc-refreshlink';

/**
 * Base service providing type-safe tRPC client functionality with advanced features.
 *
 * This service serves as the foundation for all backend communication in the application.
 * It provides a comprehensive tRPC client setup with multiple layers of functionality:
 *
 * **Core Features:**
 * - **Authentication**: Automatic token injection and refresh handling
 * - **Caching**: IndexedDB-based response caching with TTL support
 * - **Request Management**: Abort controller for canceling ongoing requests
 * - **Error Handling**: Centralized error interception and user-friendly messages
 * - **Logging**: Development-time request/response logging
 * - **Batching**: HTTP request batching for improved performance
 *
 * **Architecture:**
 * The service uses tRPC's link system to create a processing pipeline:
 * 1. Logger Link - Logs requests in development
 * 2. Refresh Link - Handles token refresh automatically
 * 3. Error Link - Transforms error messages for better UX
 * 4. HTTP Link - Performs the actual HTTP requests with auth headers
 *
 * @template T - The database table type this service operates on
 *
 * @example
 * ```typescript
 * // Extending for a specific entity
 * @Injectable()
 * class PersonsService extends TRPCService<'persons'> {
 *   async getPersons() {
 *     return this.api.persons.getAll.query();
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using caching
 * const cachedData = await this.runCachedCall(
 *   this.api.persons.getAll.query(options),
 *   'getPersons',
 *   options,
 *   false // use cache if available
 * );
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class TRPCService<T> {
  /** Global error service */
  protected readonly errorSvc = inject(ErrorService);

  /** Angular router for navigation during auth flows */
  protected readonly router = inject(Router);

  /** Token service for authentication management */
  protected readonly tokenService = inject(TokenService);

  /** Abort controller for canceling ongoing requests */
  protected ac = new AbortController();

  /**
   * The tRPC proxy client providing type-safe API access.
   *
   * This client is configured with a complete link chain including:
   * - Authentication headers
   * - Automatic token refresh
   * - Error handling
   * - Request logging (development)
   * - HTTP batching
   *
   * Available to child services via `this.api` for making backend calls.
   */
  protected api;

  constructor() {
    this.api = createTRPCClient<TRPCRouter>({
      links: [
        loggerLink(),
        refreshLink(this.tokenService, this.router),
        errorLink(this.errorSvc),
        httpLink(this.tokenService),
      ],
    });
  }

  /**
   * Aborts any ongoing TRPC call associated with this service.
   */
  public abort() {
    this.ac.abort();
    this.ac = new AbortController(); // create a fresh controller so future calls are not auto-aborted
  }

  /**
   * Executes a TRPC call and caches the result using a hash of the API name and options.
   *
   * @param apiCall - The promise representing the API call
   * @param apiName - A name for the API being called
   * @param options - Parameters passed to the API call
   * @param refresh - If true, bypasses the cache and refreshes from the backend
   * @returns A list of results, either from the cache or from the server
   */
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

  /**
   * Adds the specified number of days to the current date.
   * Used to set expiry timestamps for cached API responses.
   *
   * @param days - The number of days to add
   * @returns A future date object
   */
  private addDays(days: number) {
    const date = new Date(Date.now());
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Generates a simple 32-bit hash for a string. Used to compress long cache keys.
   *
   * @param str - A string to hash
   * @returns A base-36 encoded short hash string
   */
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return (hash >>> 0).toString(36);
  }
}

/**
 * Creates a TRPC link that normalises errors and forwards server issues to the
 * global ErrorService.
 */
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

            if (err instanceof TRPCClientError) {
              const code = err.data?.code as string | undefined;
              const path = op.path ?? '';
              const isSignIn = path === 'auth.signIn' || path.endsWith('.signIn') || path === 'signIn';

              if (isSignIn && (code === 'BAD_REQUEST' || code === 'UNAUTHORIZED' || code === 'NOT_FOUND')) {
                // Server formatter should already do this; this is just a client fallback
                err.message = GENERIC_LOGIN_MSG;
              } else if (code === 'BAD_REQUEST') {
                err.message = GENERIC_INPUT_MSG;
              }

              if (!meta?.skipErrorHandler) errorSvc.handle(err);
            } else {
              if (!meta?.skipErrorHandler) errorSvc.handle(err as unknown);
            }

            observer.error(err);
          },
          complete: () => observer.complete(),
        });
        return unsubscribe;
      });
}

/**
 * Creates a TRPC HTTP batch link with the auth token included in headers.
 *
 * @param tokenSvc - The TokenService instance
 */
function httpLink(tokenSvc: TokenService) {
  return httpBatchLink({
    url: environment.apiUrl,
    headers() {
      const authToken = tokenSvc.getAuthToken();
      return authToken ? { Authorization: `Bearer ${authToken}` } : {};
    },
  });
}
