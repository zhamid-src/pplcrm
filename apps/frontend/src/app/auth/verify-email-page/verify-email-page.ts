import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { AuthLayoutComponent } from 'apps/frontend/src/app/auth/auth-layout';
import { AuthService } from '../auth-service';

@Component({
  selector: 'pc-verify-email',
  imports: [RouterLink, AuthLayoutComponent, Icon],
  templateUrl: './verify-email-page.html',
})
export class VerifyEmailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;

  protected readonly status = signal<'idle' | 'success' | 'error'>('idle');
  protected readonly errorMessage = signal<string>('');

  public ngOnInit(): void {

    void this.loadOnInit();

  }


  private async loadOnInit(): Promise<void> {
    const code = this.route.snapshot.queryParamMap.get('code');

    if (!code) {
      this.status.set('error');
      this.errorMessage.set('Invalid or missing verification code.');
      return;
    }

    const end = this._loading.begin();
    this.status.set('idle');

    try {
      const result = await this.auth.verifyEmail({ code });
      if (result && result.success) {
        this.status.set('success');
      } else {
        this.status.set('error');
        this.errorMessage.set('Verification failed. The link may be invalid.');
      }
    } catch (err: any) {
      this.status.set('error');
      this.errorMessage.set(err.message || 'An unexpected error occurred during verification.');
    } finally {
      end();
    }
  }
}
