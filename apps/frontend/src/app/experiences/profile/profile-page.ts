import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { form, required, email, FormField } from '@angular/forms/signals';
import { IAuthUserDetail, IUserStatsSnapshot, UpdateAuthUserType } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { AuthService } from '../../auth/auth-service';

@Component({
  selector: 'pc-profile-page',
  imports: [DatePipe, FormField, Icon],
  templateUrl: './profile-page.html',
})
export class ProfilePage implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly stats = signal<IUserStatsSnapshot | null>(null);
  protected readonly detail = signal<IAuthUserDetail | null>(null);

  protected readonly payload = signal({
    email: '',
    first_name: '',
    last_name: '',
  });

  protected readonly form = form(this.payload, (p) => {
    required(p.email);
    email(p.email);
    required(p.first_name);
  });

  protected readonly displayName = computed(() => {
    const user = this.detail();
    if (!user) return '';
    const tokens = [user.first_name, user.last_name].filter((t) => !!t && t.trim().length > 0);
    const name = tokens.join(' ').trim();
    return name || user.email;
  });

  protected readonly initials = computed(() => {
    const first = this.payload().first_name?.trim();
    const last = this.payload().last_name?.trim();
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    }
    if (first) {
      return first[0].toUpperCase();
    }
    const emailStr = this.payload().email?.trim();
    if (emailStr) {
      return emailStr[0].toUpperCase();
    }
    return '?';
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
        icon: 'envelope' as const,
        asOf: null,
      },
      {
        key: 'contacts',
        title: 'Contacts Added',
        value: s.contacts_added.total,
        subtitle: s.contacts_added.last_created_at ? 'Last new contact' : 'No contacts yet',
        icon: 'users' as const,
        asOf: s.contacts_added.last_created_at,
      },
      {
        key: 'imports',
        title: 'Files Imported',
        value: s.files_imported.count,
        subtitle: `${s.files_imported.total_rows} people imported`,
        icon: 'arrow-down-tray' as const,
        asOf: s.files_imported.last_activity_at,
      },
      {
        key: 'exports',
        title: 'Files Exported',
        value: s.files_exported.count,
        subtitle: `${s.files_exported.total_rows} rows exported`,
        icon: 'arrow-up-tray' as const,
        asOf: s.files_exported.last_activity_at,
      },
    ];
  });

  public ngOnInit(): void {
    void this.load();
  }

  protected async save(event?: Event) {
    if (event) {
      event.preventDefault();
    }

    this.form().markAsTouched();
    if (this.form().invalid()) {
      return;
    }

    const user = this.detail();
    if (!user) return;

    const payload = this.buildPayload();

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.auth.updateUserProfile(user.id, payload);
      this.alerts.showSuccess('Profile updated successfully');
      await this.load();
      this.form().reset();
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to update profile';
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

  protected formatAsOf(date: Date | null): string {
    if (!date) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(date));
    } catch {
      return date.toString();
    }
  }

  private async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      // First ensure we have/refresh current user
      const currentUser = await this.auth.getCurrentUser();
      if (!currentUser) {
        throw new Error('Not logged in');
      }
      
      const user = await this.auth.getProfileById(currentUser.id);
      this.detail.set(user);
      this.stats.set(user.stats as any);
      this.setForm(user);
      this.form().reset();
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Failed to load profile';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.loading.set(false);
    }
  }

  private setForm(user: IAuthUserDetail) {
    this.payload.set({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name ?? '',
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
    } as UpdateAuthUserType;
  }
}
