/**
 * Custom application-level API error representing normalized errors from the backend.
 * Extends the standard Error class so UI components don't need to depend on network/tRPC error classes.
 */
export class ApiError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'ApiError';
  }
}
