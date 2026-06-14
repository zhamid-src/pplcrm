import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { IAuthUserDetail, IUserStatsSnapshot } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { AuthUsersService } from '../services/authusers-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

@Component({
  selector: 'pc-user-view',
  imports: [DatePipe, RouterModule, Icon, RecordActivities, FormActions],
  templateUrl: './user-view.html',
})
export class UserViewComponent {
  readonly id = input.required<string>();

  private readonly alerts = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(AuthUsersService);
  private readonly auth = inject(AuthService);
  private readonly dialogs = inject(ConfirmDialogService);

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected readonly error = signal<string | null>(null);
  protected readonly stats = signal<IUserStatsSnapshot | null>(null);
  protected readonly detail = signal<IAuthUserDetail | null>(null);

  protected readonly avatarUrl = computed(() => {
    const user = this.detail();
    return user ? this.auth.resolveAvatarUrl(user.avatar_url) : null;
  });

  protected readonly currentUserRole = computed(() => this.auth.getUser()?.role);
  protected readonly currentUserId = computed(() => this.auth.getUser()?.id);
  protected readonly isOwnerBeingEdited = computed(() => this.detail()?.role === 'owner');

  protected readonly displayName = computed(() => {
    const user = this.detail();
    if (!user) return '';
    const tokens = [user.first_name, user.last_name].filter((t) => !!t && t.trim().length > 0);
    const name = tokens.join(' ').trim();
    return name || user.email;
  });

  protected readonly activityCards = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      {
        key: 'emails',
        title: 'Emails Assigned',
        value: s.emails_assigned.total,
        subtitle: `${s.emails_assigned.open} open · ${s.emails_assigned.closed} closed`,
        asOf: null,
      },
      {
        key: 'contacts',
        title: 'Contacts Added',
        value: s.contacts_added.total,
        subtitle: s.contacts_added.last_created_at ? 'Last new contact' : 'No contacts yet',
        asOf: s.contacts_added.last_created_at,
      },
      {
        key: 'imports',
        title: 'Files Imported',
        value: s.files_imported.count,
        subtitle: `${s.files_imported.total_rows} people imported`,
        asOf: s.files_imported.last_activity_at,
      },
      {
        key: 'exports',
        title: 'Files Exported',
        value: s.files_exported.count,
        subtitle: `${s.files_exported.total_rows} rows exported`,
        asOf: s.files_exported.last_activity_at,
      },
    ];
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

  protected editUser() {
    void this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected async deleteUser() {
    if (!this.id()) return;
    if (String(this.id()) === String(this.currentUserId())) {
      this.alerts.showError('You cannot delete yourself.');
      return;
    }
    if (this.currentUserRole() === 'admin' && this.isOwnerBeingEdited()) {
      this.alerts.showError('Admins cannot delete owner accounts.');
      return;
    }

    const confirmed = await this.dialogs.confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    const end = this._loading.begin();
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
      end();
    }
  }

  protected formatAsOf(date: Date | null): string {
    if (!date) return '—';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return date.toString();
    }
  }

  private async load() {
    const end = this._loading.begin();
    this.error.set(null);
    try {
      const user = await this.users.getById(this.id());
      this.detail.set(user);
      this.stats.set(user.stats);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Failed to load user';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      end();
    }
  }
}
