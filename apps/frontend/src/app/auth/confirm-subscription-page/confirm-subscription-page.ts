import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Icon } from '@icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { AuthLayoutComponent } from 'apps/frontend/src/app/auth/auth-layout';
import { ConfirmSubscriptionService } from './confirm-subscription-service';

@Component({
  selector: 'pc-confirm-subscription',
  imports: [AuthLayoutComponent, Icon],
  templateUrl: './confirm-subscription-page.html',
})
export class ConfirmSubscriptionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly confirmSvc = inject(ConfirmSubscriptionService);

  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;

  protected readonly status = signal<'idle' | 'success' | 'error'>('idle');
  protected readonly errorMessage = signal<string>('');

  public ngOnInit(): void {

    void this.loadOnInit();

  }


  private async loadOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status.set('error');
      this.errorMessage.set('Invalid or missing confirmation token.');
      return;
    }

    const end = this._loading.begin();
    this.status.set('idle');

    try {
      const result = await this.confirmSvc.confirmSubscription(token);
      if (result && result.success) {
        this.status.set('success');
      } else {
        this.status.set('error');
        this.errorMessage.set('Confirmation failed. The link may be invalid or expired.');
      }
    } catch (err: any) {
      this.status.set('error');
      this.errorMessage.set(err.message || 'An unexpected error occurred during confirmation.');
    } finally {
      end();
    }
  }
}
