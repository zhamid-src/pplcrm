import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ConfirmDialogService } from '@uxcommon/components/confirm-dialog.service';
import { Icon } from '@icons/icon';
import { AuthService } from '../../../auth/auth-service';

interface PasskeyRow {
  id: string;
  friendly_name: string | null;
  device_type: string;
  backed_up: boolean;
  created_at: Date;
  editingName: boolean;
  pendingName: string;
}

@Component({
  selector: 'pc-passkey-settings',
  imports: [DatePipe, Icon],
  templateUrl: './passkey-settings.html',
})
export class PasskeySettingsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly alerts = inject(AlertService);
  private readonly dialog = inject(ConfirmDialogService);

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected readonly adding = signal(false);
  protected readonly passkeys = signal<PasskeyRow[]>([]);

  ngOnInit(): void {
    void this.loadPasskeys();
  }

  protected async loadPasskeys() {
    const end = this._loading.begin();
    try {
      const rows = (await this.authService.listPasskeys()) as any[];
      this.passkeys.set(
        rows.map((r) => ({
          id: String(r.id),
          friendly_name: r.friendly_name ?? null,
          device_type: r.device_type,
          backed_up: r.backed_up,
          created_at: new Date(r.created_at),
          editingName: false,
          pendingName: r.friendly_name ?? '',
        })),
      );
    } catch (err: any) {
      this.alerts.showError(err.message || 'Failed to load passkeys.');
    } finally {
      end();
    }
  }

  protected async addPasskey() {
    this.adding.set(true);
    try {
      const result = await this.authService.registerPasskey();
      if (result.verified) {
        this.alerts.showSuccess('Passkey registered successfully.');
        await this.loadPasskeys();
      }
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        this.alerts.showError(err.message || 'Failed to register passkey.');
      }
    } finally {
      this.adding.set(false);
    }
  }

  protected async deletePasskey(passkey: PasskeyRow) {
    const confirmed = await this.dialog.confirm({
      title: 'Remove Passkey',
      message: `Remove "${passkey.friendly_name || 'this passkey'}"? You will no longer be able to sign in with it.`,
      variant: 'danger',
      confirmText: 'Remove',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    try {
      await this.authService.deletePasskey(passkey.id);
      this.alerts.showSuccess('Passkey removed.');
      this.passkeys.update((list) => list.filter((p) => p.id !== passkey.id));
    } catch (err: any) {
      this.alerts.showError(err.message || 'Failed to remove passkey.');
    }
  }

  protected startEditName(passkey: PasskeyRow) {
    this.passkeys.update((list) =>
      list.map((p) => (p.id === passkey.id ? { ...p, editingName: true, pendingName: p.friendly_name ?? '' } : p)),
    );
  }

  protected cancelEditName(passkey: PasskeyRow) {
    this.passkeys.update((list) => list.map((p) => (p.id === passkey.id ? { ...p, editingName: false } : p)));
  }

  protected updatePendingName(passkey: PasskeyRow, value: string) {
    this.passkeys.update((list) => list.map((p) => (p.id === passkey.id ? { ...p, pendingName: value } : p)));
  }

  protected async savePasskeyName(passkey: PasskeyRow) {
    const name = passkey.pendingName.trim();
    if (!name) return;
    try {
      await this.authService.updatePasskeyName(passkey.id, name);
      this.passkeys.update((list) =>
        list.map((p) => (p.id === passkey.id ? { ...p, friendly_name: name, editingName: false } : p)),
      );
    } catch (err: any) {
      this.alerts.showError(err.message || 'Failed to rename passkey.');
    }
  }
}
