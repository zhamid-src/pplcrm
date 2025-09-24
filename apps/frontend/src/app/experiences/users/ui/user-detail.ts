import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IAuthUserDetail, IUserStatsSnapshot, UpdateAuthUserType } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';

import { AuthUsersService } from '../services/authusers-service';

@Component({
  selector: 'pc-user-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Icon],
  templateUrl: './user-detail.html',
})
export class UserDetailComponent implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(AuthUsersService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly stats = signal<IUserStatsSnapshot | null>(null);
  protected readonly detail = signal<IAuthUserDetail | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    first_name: ['', [Validators.required]],
    last_name: [''],
    role: [''],
    verified: [false],
  });
  protected readonly controls = this.form.controls;

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

  private id = '';

  public ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.id) {
      this.error.set('Missing user identifier.');
      this.loading.set(false);
      return;
    }
    void this.load();
  }

  protected async save() {
    if (this.form.invalid || !this.id) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.users.update(this.id, payload);
      this.alerts.showSuccess('User updated');
      await this.load();
      this.form.markAsPristine();
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
    this.form.markAsPristine();
  }

  protected goBack() {
    void this.router.navigate(['../'], { relativeTo: this.route });
  }

  protected formatAsOf(date: Date | null): string {
    if (!date) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return date.toString();
    }
  }

  private async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const user = await this.users.getById(this.id);
      this.detail.set(user);
      this.stats.set(user.stats);
      this.setForm(user);
      this.form.markAsPristine();
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Failed to load user';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.loading.set(false);
    }
  }

  private setForm(user: IAuthUserDetail) {
    this.form.reset(
      {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name ?? '',
        role: user.role ?? '',
        verified: Boolean(user.verified),
      },
      { emitEvent: false },
    );
  }

  private buildPayload(): UpdateAuthUserType {
    const raw = this.form.getRawValue();
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
