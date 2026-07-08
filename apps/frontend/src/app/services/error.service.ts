import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { JSendServerError } from '../../../../../libs/common/src';
import { TRPCClientError } from '@trpc/client';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ApiError } from './api/api-error';
import { getUserErrorMessage } from './api/user-message';

import { TokenService } from './api/token-service';
import { isCurrentRoutePublic } from '../routing/public-routes';

@Service()
export class ErrorService {
  private readonly alerts = inject(AlertService);
  private readonly router = inject(Router);
  private readonly tokenSvc = inject(TokenService);

  private lastRedirect = 0;

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

    if (error instanceof ApiError) {
      const original = error.originalError;
      if (original instanceof TRPCClientError) {
        const code = original.data?.code;
        if (!this.redirectFromCode(code)) {
          this.alerts.showError(error.message);
        }
        return;
      }
      this.alerts.showError(error.message);
      return;
    }

    // Uncaught exceptions land here via GlobalErrorHandler — never show their
    // raw message (e.g. a TypeError) to the user; the console has the details.
    this.alerts.showError(getUserErrorMessage(error, 'Something went wrong, please try again'));
  }

  /**
   * Sign the user out and send them to /signin. Called for any 401/UNAUTHORIZED — including on
   * requests that pass `skipErrorHandler` (that flag suppresses the error toast, not the sign-out).
   * No-ops on public pages and de-dupes rapid calls, so probes and public routes stay put.
   */
  public redirectToSignIn(): void {
    this.redirect();
  }

  private redirect(): boolean {
    // Guests belong on public pages (reset links, public forms, subscription confirmation). A stray
    // 401/UNAUTHORIZED there must not bounce them to /signin — let the caller surface the error.
    if (isCurrentRoutePublic(this.router.url)) return false;

    const now = Date.now();
    if (now - this.lastRedirect < 3000) return false;
    this.lastRedirect = now;

    this.tokenSvc.clearAll();
    const returnUrl = this.router.url;
    void this.router.navigate(['/signin'], { queryParams: { returnUrl } });
    return true;
  }

  private redirectFromCode(code?: string): boolean {
    if (code === 'UNAUTHORIZED') return this.redirect();
    return false;
  }

  private redirectFromStatus(status?: number): boolean {
    if (status === 401) return this.redirect();
    return false;
  }
}
