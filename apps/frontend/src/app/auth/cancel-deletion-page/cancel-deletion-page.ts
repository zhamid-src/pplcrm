import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { AuthLayoutComponent } from '../auth-layout';
import { TRPCService } from '../../services/api/trpc-service';
import { AuthService } from '../auth-service';

@Component({
  selector: 'pc-cancel-deletion-page',
  imports: [RouterLink, AuthLayoutComponent, Icon, DatePipe],
  templateUrl: './cancel-deletion-page.html',
})
export class CancelDeletionPage extends TRPCService<any> implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);

  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;
  protected readonly status = signal<'idle' | 'success' | 'error'>('idle');
  protected readonly errorMessage = signal('');
  protected readonly actionPending = signal(false);

  // Authenticated flow: user is logged in with a pending deletion
  protected readonly loggedInUser = this.auth.getUserSignal();
  protected get deletionDate(): Date | null {
    const d = this.loggedInUser()?.tenant_deletion_scheduled_at;
    return d ? new Date(d) : null;
  }

  // Token flow: arrived via email link (not logged in)
  private tenantId: string | null = null;
  private token: string | null = null;
  protected readonly isTokenFlow = signal(false);
  private sessionPollInterval: ReturnType<typeof setInterval> | null = null;

  public async ngOnInit() {
    this.tenantId = this.route.snapshot.queryParamMap.get('tid');
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (this.tenantId && this.token) {
      // Email link flow — process immediately
      this.isTokenFlow.set(true);
      await this.cancelViaToken();
    } else if (this.auth.getUser()) {
      // Logged-in flow — poll every 5s so if the account is deleted while on this
      // page the session clears and the user is redirected to sign-in automatically
      this.sessionPollInterval = setInterval(async () => {
        const user = await this.auth.getCurrentUser().catch(() => null);
        if (!user) {
          await this.auth.signOut();
        }
      }, 5000);
    }
  }

  public ngOnDestroy() {
    if (this.sessionPollInterval) {
      clearInterval(this.sessionPollInterval);
    }
  }

  private async cancelViaToken() {
    const end = this._loading.begin();
    try {
      await this.api.auth.cancelTenantDeletionByToken.mutate({ tenantId: this.tenantId!, token: this.token! });
      this.status.set('success');
    } catch (err: any) {
      this.status.set('error');
      this.errorMessage.set(err.message || 'This link is invalid or the deletion window has already passed.');
    } finally {
      end();
    }
  }

  protected async cancelViaAuth() {
    this.actionPending.set(true);
    try {
      await this.api.auth.cancelTenantDeletion.mutate();
      // Refresh user so guard clears and we can navigate
      await this.auth.getCurrentUser();
      this.router.navigate(['/']);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to cancel deletion. Please try again.');
    } finally {
      this.actionPending.set(false);
    }
  }
}
