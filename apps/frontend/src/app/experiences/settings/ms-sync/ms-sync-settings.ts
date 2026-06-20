import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { TRPCService } from '../../../services/api/trpc-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

@Component({
  selector: 'pc-ms-sync-settings',
  imports: [Icon],
  templateUrl: './ms-sync-settings.html',
})
export class MsSyncSettings extends TRPCService<unknown> implements OnInit, OnDestroy {
  private readonly alertSvc = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(ConfirmDialogService);

  protected readonly status = signal<{
    connected: boolean;
    msEmail: string | null;
    syncedAt: string | null;
    syncing?: boolean;
  } | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isConnecting = signal(false);
  protected readonly isSyncing = signal(false);
  protected readonly connectError = signal<string | null>(null);
  protected readonly lastSyncResult = signal<{ inserted: number } | null>(null);
  private pollingTimer: any = null;

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

  public ngOnDestroy() {
    this.stopPollingStatus();
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
      await this.api.msSync.syncNow.mutate();
      await this.loadStatus();
    } catch {
      this.alertSvc.showError('Sync failed. Please try reconnecting your account.');
      this.isSyncing.set(false);
    }
  }

  protected async disconnect() {
    const confirmed = await this.dialogs.confirm({
      title: 'Disconnect Office 365',
      message: 'Are you sure you want to disconnect your Office 365 account?',
      variant: 'warning',
      confirmText: 'Disconnect',
    });
    if (!confirmed) return;

    const removeLocal = await this.dialogs.confirm({
      title: 'Delete Synced Emails',
      message: 'Would you also like to delete all locally stored emails that were synced from this account?',
      variant: 'danger',
      confirmText: 'Delete Emails',
      cancelText: 'Keep Emails',
    });
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
    try {
      const s = await this.api.msSync.getConnectionStatus.query();
      this.status.set(s);
      if (s?.syncing) {
        this.isSyncing.set(true);
        this.startPollingStatus();
      } else {
        this.isSyncing.set(false);
        this.stopPollingStatus();
      }
    } catch (err) {
      console.error('Failed to load connection status:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  private startPollingStatus() {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(async () => {
      try {
        const s = await this.api.msSync.getConnectionStatus.query();
        this.status.set(s);
        if (!s?.syncing) {
          this.isSyncing.set(false);
          this.stopPollingStatus();
          this.alertSvc.showSuccess('Office 365 mailbox sync completed.');
        }
      } catch (err) {
        console.error('Error polling sync status:', err);
        this.stopPollingStatus();
      }
    }, 4000);
  }

  private stopPollingStatus() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
}
