import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { form, required, email, FormField, disabled } from '@angular/forms/signals';
import { Router, RouterModule } from '@angular/router';
import { IAuthUserDetail, UpdateAuthUserType } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

import { UserAdminService } from '../services/useradmin-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

@Component({
  selector: 'pc-user-detail',
  imports: [FormField, RouterModule, Icon, FormActions],
  templateUrl: './user-detail.html',
})
export class UserDetailComponent {
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

  protected readonly displayName = computed(() => {
    const user = this.detail();
    if (!user) return '';
    const tokens = [user.first_name, user.last_name].filter((t) => !!t && t.trim().length > 0);
    const name = tokens.join(' ').trim();
    return name || user.email;
  });

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
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to update user';
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
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to trigger password reset';
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
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Unable to delete user');
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
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Failed to load user';
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
