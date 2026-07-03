import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { AuthLayoutComponent } from 'apps/frontend/src/app/auth/auth-layout';
import { SettingsService } from '../../experiences/settings/services/settings-service';

@Component({
  selector: 'pc-verify-sender-email',
  imports: [RouterLink, AuthLayoutComponent, Icon],
  templateUrl: './verify-sender-email-page.html',
})
export class VerifySenderEmailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly settingsSvc = inject(SettingsService);

  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;

  protected readonly status = signal<'idle' | 'success' | 'error'>('idle');
  protected readonly errorMessage = signal<string>('');
  protected readonly verifiedEmail = signal<string>('');

  public ngOnInit(): void {
    void this.loadOnInit();
  }

  private async loadOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status.set('error');
      this.errorMessage.set('Invalid or missing verification token.');
      return;
    }

    const end = this._loading.begin();
    this.status.set('idle');

    try {
      const result = await this.settingsSvc.verifySenderEmail(token);
      if (result && result.success) {
        this.status.set('success');
        this.verifiedEmail.set(result.email || '');
      } else {
        this.status.set('error');
        this.errorMessage.set('Verification failed. The token may be invalid.');
      }
    } catch (err) {
      this.status.set('error');
      this.errorMessage.set(
        err instanceof Error && err.message ? err.message : 'An unexpected error occurred during verification.',
      );
    } finally {
      end();
    }
  }
}
