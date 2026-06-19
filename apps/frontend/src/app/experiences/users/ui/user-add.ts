import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { form, required, email, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';

import { UserAdminService } from '../services/useradmin-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

@Component({
  selector: 'pc-user-add',
  imports: [FormField, FormActions],
  templateUrl: './user-add.html',
})
export class UserAddComponent implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(UserAdminService);
  private readonly auth = inject(AuthService);

  protected readonly error = signal<string | null>(null);

  protected readonly currentUserRole = computed(() => this.auth.getUser()?.role);

  protected readonly payload = signal({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
  });

  protected readonly form = form(this.payload, (p) => {
    required(p.email);
    email(p.email);
    required(p.first_name);
  });

  protected readonly submitting = signal(false);

  public ngOnInit(): void {
    const state = window.history.state;
    if (state && state.cloneData) {
      const data = state.cloneData;
      this.payload.set({
        email: data.email || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        role: data.role || '',
      });
    }
  }

  protected cancel() {
    void this.router.navigate(['../'], { relativeTo: this.route });
  }

  protected async submit(done?: (() => void) | Event) {
    if (done instanceof Event) {
      done.preventDefault();
    }

    this.form().markAsTouched();
    if (this.form().invalid()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    try {
      const payload = this.toPayload();
      await this.users.add(payload);
      this.users.triggerRefresh();
      this.alerts.showSuccess('Invitation sent');
      this.form().reset();
      if (typeof done === 'function') {
        done();
      } else {
        await this.router.navigate(['../'], { relativeTo: this.route });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to invite user';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.submitting.set(false);
    }
  }

  private toPayload() {
    const raw = this.payload();
    return {
      email: raw.email?.trim() ?? '',
      first_name: raw.first_name?.trim() ?? '',
      last_name: raw.last_name?.trim() ? raw.last_name.trim() : null,
      role: raw.role?.trim() ? raw.role.trim() : null,
    };
  }
}
