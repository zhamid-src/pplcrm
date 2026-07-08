import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { form, required, email, disabled } from '@angular/forms/signals';
import { Router, RouterModule } from '@angular/router';
import { IAuthUserDetail, UpdateAuthUserType } from '../../../../../../../libs/common/src';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { Input as PcInput } from '@uxcommon/components/input/input';
import { Select as PcSelect } from '@uxcommon/components/select/select';
import { Toggle as PcToggle } from '@uxcommon/components/toggle/toggle';
import { DetailHeader as PcDetailHeader } from '@uxcommon/components/detail-header/detail-header';
import type { PcBreadcrumb } from '@uxcommon/components/breadcrumbs/breadcrumbs';
import { Card as PcCard } from '@uxcommon/components/card/card';

import { UserAdminService } from '../services/useradmin-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { injectUnsavedChanges } from '@frontend/services/unsaved-changes-guard';

@Component({
  selector: 'pc-user-edit',
  imports: [PcInput, PcSelect, PcToggle, RouterModule, Icon, PcDetailHeader, PcCard],
  templateUrl: './user-edit.html',
})
export class UserEditComponent {
  readonly id = input.required<string>();

  private readonly alerts = inject(AlertService);
  private readonly router = inject(Router);
  private readonly users = inject(UserAdminService);
  private readonly auth = inject(AuthService);
  private readonly dialogs = inject(ConfirmDialogService);

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly detail = signal<IAuthUserDetail | null>(null);

  protected readonly currentUserRole = computed(() => this.auth.getUser()?.role);
  protected readonly isOwnerBeingEdited = computed(() => this.detail()?.role === 'owner');

  protected readonly payload = signal({
    email: '',
    first_name: '',
    last_name: '',
    role: '',
    verified: false,
  });

  protected readonly form = form(this.payload, (p) => {
    required(p.email);
    email(p.email);
    required(p.first_name);
    disabled(p.role, () => this.currentUserRole() === 'admin' && this.isOwnerBeingEdited());
    disabled(p.verified, () => true);
  });

  protected readonly unsavedChanges = injectUnsavedChanges(this.form, this.payload);

  protected readonly displayName = computed(() => {
    const user = this.detail();
    if (!user) return '';
    const tokens = [user.first_name, user.last_name].filter((t) => !!t && t.trim().length > 0);
    const name = tokens.join(' ').trim();
    return name || user.email;
  });

  protected readonly crumbs = computed<PcBreadcrumb[]>(() => [
    { label: 'Users', route: '/users' },
    { label: this.displayName() || 'User', route: ['/users', this.id()] },
    { label: 'Edit' },
  ]);

  constructor() {
    effect(() => {
      const currentId = this.id();
      untracked(() => {
        if (!currentId) {
          this.error.set('Missing user identifier.');
          return;
        }
        void this.load();
      });
    });
  }

  public canDeactivate(): Promise<boolean> {
    return this.unsavedChanges.confirmDiscardIfDirty(this.displayName() || 'this user');
  }

  protected async save(done?: (() => void) | Event) {
    if (done instanceof Event) {
      done.preventDefault();
    }

    this.form().markAsTouched();
    if (this.form().invalid() || !this.id()) {
      return;
    }

    const payload = this.buildPayload();

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.users.update(this.id(), payload);
      this.alerts.showSuccess('User updated');
      this.users.triggerRefresh();
      await this.load();
      this.form().reset();
      if (typeof done === 'function') {
        done();
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Unable to update user';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.saving.set(false);
    }
  }

  protected resetForm() {
    const user = this.detail();
    if (!user) return;
    this.setForm(user);
    this.form().reset();
  }

  protected readonly resettingPassword = signal(false);

  protected async triggerPasswordReset() {
    if (!this.id()) return;
    this.resettingPassword.set(true);
    try {
      await this.users.adminTriggerPasswordReset(this.id());
      this.alerts.showSuccess('Password reset email sent to user');
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Unable to trigger password reset';
      this.alerts.showError(message);
    } finally {
      this.resettingPassword.set(false);
    }
  }

  protected async deleteUser() {
    if (!this.id()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    this.saving.set(true);
    try {
      const success = await this.users.delete(this.id());
      if (!success) {
        throw new Error('User deletion is not supported');
      }
      this.alerts.showSuccess('User deleted');
      await this.router.navigate(['/users']);
    } catch (err) {
      this.alerts.showError(err instanceof Error && err.message ? err.message : 'Unable to delete user');
    } finally {
      this.saving.set(false);
    }
  }

  private async load() {
    const end = this._loading.begin();
    this.error.set(null);
    try {
      const user = await this.users.getById(this.id());
      this.detail.set(user);
      this.setForm(user);
      this.form().reset();
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Failed to load user';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      end();
    }
  }

  private setForm(user: IAuthUserDetail) {
    this.payload.set({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name ?? '',
      role: user.role ?? '',
      verified: Boolean(user.verified),
    });
  }

  private buildPayload(): UpdateAuthUserType {
    const raw = this.payload();
    const normalize = (value: string | null | undefined) => {
      const trimmed = value?.trim() ?? '';
      return trimmed.length ? trimmed : null;
    };
    return {
      email: raw.email?.trim() ?? '',
      first_name: raw.first_name?.trim() ?? '',
      last_name: normalize(raw.last_name),
      role: normalize(raw.role),
      verified: Boolean(raw.verified),
    } as UpdateAuthUserType;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
