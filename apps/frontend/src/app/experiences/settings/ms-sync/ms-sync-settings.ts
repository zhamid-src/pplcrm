/**
 * @file Component for connecting and syncing an Office 365 mailbox.
 * Allows users to connect their Microsoft account, trigger a manual sync,
 * and disconnect their account.
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { TRPCService } from '../../../services/api/trpc-service';

@Component({
  selector: 'pc-ms-sync-settings',
  imports: [Icon],
  template: `
    <div class="space-y-6">
      @if (isLoading()) {
        <div class="flex items-center gap-3 text-base-content/60">
          <span class="loading loading-spinner loading-sm"></span>
          <span class="text-sm">Loading connection status…</span>
        </div>
      } @else if (status()?.connected) {
        <!-- Connected state -->
        <div class="rounded-xl border border-success/30 bg-success/10 px-5 py-4 flex items-start gap-4">
          <pc-icon name="check-circle" class="text-success mt-0.5 shrink-0" [size]="5"></pc-icon>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-success">Connected</p>
            <p class="text-sm text-base-content/70 mt-0.5 truncate">{{ status()?.msEmail }}</p>
            @if (status()?.syncedAt) {
              <p class="text-xs text-base-content/50 mt-1">Last synced: {{ formatDate(status()!.syncedAt) }}</p>
            }
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            id="ms-sync-now-btn"
            type="button"
            class="btn btn-primary"
            [disabled]="isSyncing()"
            (click)="syncNow()"
          >
            @if (isSyncing()) {
              <span class="loading loading-spinner loading-xs mr-2"></span>
              Syncing…
            } @else {
              <pc-icon name="arrow-path" [size]="4" class="mr-2"></pc-icon>
              Sync Now
            }
          </button>

          <button
            id="ms-disconnect-btn"
            type="button"
            class="btn btn-ghost text-error hover:bg-error/10"
            [disabled]="isSyncing()"
            (click)="disconnect()"
          >
            <pc-icon name="x-circle" [size]="4" class="mr-2"></pc-icon>
            Disconnect
          </button>
        </div>

        @if (lastSyncResult()) {
          <p class="text-sm text-base-content/60">
            ✓ Sync complete — {{ lastSyncResult()!.inserted }} new email(s) imported.
          </p>
        }
      } @else {
        <!-- Disconnected state -->
        <div class="rounded-xl border border-base-200 bg-base-50 px-5 py-4">
          <p class="text-sm text-base-content/70">
            Connect your Office 365 account to automatically sync incoming emails into your pplcrm inbox.
          </p>
        </div>

        <button
          id="ms-connect-btn"
          type="button"
          class="btn btn-primary gap-2"
          [disabled]="isConnecting()"
          (click)="connect()"
        >
          @if (isConnecting()) {
            <span class="loading loading-spinner loading-xs"></span>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 23 23" fill="none">
              <path fill="#f3f3f3" d="M1 1h10v10H1z"/>
              <path fill="#f35325" d="M1 1h10v10H1z" opacity=".9"/>
              <path fill="#81bc06" d="M12 1h10v10H12z"/>
              <path fill="#05a6f0" d="M1 12h10v10H1z"/>
              <path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
          }
          Connect Office 365
        </button>

        @if (connectError()) {
          <p class="text-sm text-error flex items-center gap-1.5">
            <pc-icon name="exclamation-circle" [size]="4"></pc-icon>
            {{ connectError() }}
          </p>
        }
      }
    </div>
  `,
})
export class MsSyncSettings extends TRPCService<unknown> implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly route = inject(ActivatedRoute);

  protected readonly status = signal<{ connected: boolean; msEmail: string | null; syncedAt: string | null } | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isConnecting = signal(false);
  protected readonly isSyncing = signal(false);
  protected readonly connectError = signal<string | null>(null);
  protected readonly lastSyncResult = signal<{ inserted: number } | null>(null);

  public async ngOnInit() {
    // Handle OAuth redirect result (ms_connected or ms_error query params)
    const params = this.route.snapshot.queryParamMap;
    if (params.has('ms_connected')) {
      this.alertSvc.showSuccess('Office 365 account connected successfully!');
    } else if (params.has('ms_error')) {
      this.connectError.set(params.get('ms_error'));
    }

    await this.loadStatus();
  }

  protected async connect() {
    this.isConnecting.set(true);
    this.connectError.set(null);
    try {
      const result = await this.api.msSync.getAuthUrl.query();
      window.location.href = result.url;
    } catch {
      this.connectError.set('Failed to initiate Microsoft sign-in. Please try again.');
      this.isConnecting.set(false);
    }
  }

  protected async syncNow() {
    this.isSyncing.set(true);
    this.lastSyncResult.set(null);
    try {
      const result = await this.api.msSync.syncNow.mutate();
      this.lastSyncResult.set(result);
      await this.loadStatus();
    } catch {
      this.alertSvc.showError('Sync failed. Please try reconnecting your account.');
    } finally {
      this.isSyncing.set(false);
    }
  }

  protected async disconnect() {
    if (!confirm('Are you sure you want to disconnect your Office 365 account?')) return;
    const removeLocal = confirm('Would you also like to delete all locally stored emails that were synced from this account?');
    try {
      await this.api.msSync.disconnect.mutate({ removeLocalEmails: removeLocal });
      this.status.set({ connected: false, msEmail: null, syncedAt: null });
      this.lastSyncResult.set(null);
      this.alertSvc.showSuccess('Office 365 account disconnected.');
    } catch {
      this.alertSvc.showError('Failed to disconnect. Please try again.');
    }
  }

  protected formatDate(date: string | null) {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  }

  private async loadStatus() {
    this.isLoading.set(true);
    try {
      const s = await this.api.msSync.getConnectionStatus.query();
      this.status.set(s);
    } finally {
      this.isLoading.set(false);
    }
  }
}
