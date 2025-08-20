import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TRPCClientError } from '@trpc/client';
import { JSendFailError, JSendServerError } from '@common';

import { ErrorService } from './error.service';

/**
 * Global Angular error handler.  Only handles errors that haven't already been
 * processed by the HTTP interceptor or tRPC links.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly errors = inject(ErrorService);

  handleError(error: unknown): void {
    if (
      error instanceof HttpErrorResponse ||
      error instanceof JSendFailError ||
      error instanceof JSendServerError ||
      error instanceof TRPCClientError
    ) {
      // Already handled elsewhere
      return;
    }

    this.errors.handle(error);
    // eslint-disable-next-line no-console
    console.error(error);
  }
}
