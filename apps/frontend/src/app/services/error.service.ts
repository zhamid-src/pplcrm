import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { JSendServerError } from '@common';
import { TRPCClientError } from '@trpc/client';
import { AlertService } from '@uxcommon/alerts/alert-service';

import { TokenService } from '@services/api/token-service';

/**
 * Centralised error handling service.
 *
 * This service is used by the HTTP interceptor, TRPC links and the global
 * error handler to surface unexpected errors to the user and perform
 * navigation based on HTTP status codes.  Business logic failures should be
 * handled by the calling component and should not reach this service.
 */
@Injectable({ providedIn: 'root' })
export class ErrorService {
  private readonly alerts = inject(AlertService);
  private readonly router = inject(Router);
  private readonly tokenSvc = inject(TokenService);

  /** Timestamp of last redirect to prevent navigation loops */
  private lastRedirect = 0;

  /** Handle an error and surface a toast to the user. */
  public handle(error: unknown): void {
    console.error('ErrorService.handle:', error);
    // Handle JSend server errors produced by the HTTP interceptor
    if (error instanceof JSendServerError) {
      if (!this.redirectFromStatus(error.statusCode)) {
        this.alerts.showError(error.messageText);
      }
      return;
    }

    if (error instanceof TRPCClientError) {
      const code = error.data?.code;
      if (!this.redirectFromCode(code)) {
        this.alerts.showError(error.message);
      }
      return;
    }

    const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
    this.alerts.showError(msg);
  }

  /** Perform auth redirects with throttling and returnUrl preservation. */
  private redirect(code: 'UNAUTHORIZED' | 'FORBIDDEN'): boolean {
    const now = Date.now();
    if (now - this.lastRedirect < 3000) return false;
    this.lastRedirect = now;

    if (code === 'UNAUTHORIZED') {
      this.tokenSvc.clearAll();
      const returnUrl = this.router.url;
      this.router.navigate(['/signin'], { queryParams: { returnUrl } });
    } else {
      this.router.navigate(['/403']);
    }
    return true;
  }

  /** Map tRPC error codes to auth redirects. */
  private redirectFromCode(code?: string): boolean {
    if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') {
      this.redirect(code);
      return true;
    }
    return false;
  }

  /** Map HTTP status codes to auth redirects. */
  private redirectFromStatus(status?: number): boolean {
    if (status === 401) return this.redirect('UNAUTHORIZED');
    if (status === 403) return this.redirect('FORBIDDEN');
    return false;
  }
}
