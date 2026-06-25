import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { JSendServerError } from '../../../../../libs/common/src';
import { TRPCClientError } from '@trpc/client';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ApiError } from './api/api-error';

import { TokenService } from './api/token-service';

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

    const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
    this.alerts.showError(msg);
  }

  private redirect(): boolean {
    const now = Date.now();
    if (now - this.lastRedirect < 3000) return false;
    this.lastRedirect = now;

    this.tokenSvc.clearAll();
    const returnUrl = this.router.url;
    void this.router.navigate(['/signin'], { queryParams: { returnUrl } });
    return true;
  }

  private redirectFromCode(code?: string): boolean {
    if (code === 'UNAUTHORIZED' && !this.router.url.startsWith('/signin') && !this.router.url.startsWith('/signup')) {
      this.redirect();
      return true;
    }
    return false;
  }

  private redirectFromStatus(status?: number): boolean {
    if (status === 401) return this.redirect();
    return false;
  }
}
