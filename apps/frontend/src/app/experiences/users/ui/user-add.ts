import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { form, required, email, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';

import { AuthUsersService } from '../services/authusers-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

@Component({
  selector: 'pc-user-add',
  imports: [FormField, FormActions],
  template: `
    <section class="max-w-3xl mx-auto w-full p-6">
      <div class="flex items-center justify-between border-b border-base-200 pb-4 mb-6">
        <div>
          <h1 class="text-2xl font-semibold">Invite User</h1>
          <p class="text-sm text-base-content/60">Send an invitation to add a new teammate to this tenant.</p>
        </div>
        <pc-form-actions
          [isLoading]="submitting()"
          [signalForm]="form"
          (btn1Clicked)="submit($event)"
          [buttonsToShow]="'two'"
          [btn1Text]="'Send Invite'"
          [btn1Icon]="'save'"
        ></pc-form-actions>
      </div>

      <form class="space-y-4" (submit)="submit($event)" novalidate>
        <div class="space-y-1">
          <label class="block text-sm font-medium" for="email">Email</label>
          <input
            id="email"
            type="email"
            class="w-full rounded border border-border px-3 py-2"
            [formField]="form.email"
            autocomplete="email"
          />
          @if (form.email().invalid() && (form.email().dirty() || form.email().touched())) {
            <p class="text-sm text-danger">Please enter a valid email address.</p>
          }
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="block text-sm font-medium" for="first_name">First name</label>
            <input
              id="first_name"
              type="text"
              class="w-full rounded border border-border px-3 py-2"
              [formField]="form.first_name"
              autocomplete="given-name"
            />
            @if (form.first_name().invalid() && (form.first_name().dirty() || form.first_name().touched())) {
              <p class="text-sm text-danger">First name is required.</p>
            }
          </div>

          <div class="space-y-1">
            <label class="block text-sm font-medium" for="last_name">Last name</label>
            <input
              id="last_name"
              type="text"
              class="w-full rounded border border-border px-3 py-2"
              [formField]="form.last_name"
              autocomplete="family-name"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium" for="role">Role</label>
          <select id="role" class="w-full rounded border border-border px-3 py-2 bg-base-100" [formField]="form.role">
            @if (currentUserRole() !== 'admin') {
              <option value="owner">Owner</option>
            }
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>

        @if (error()) {
          <p class="text-sm text-danger">{{ error() }}</p>
        }
      </form>
    </section>
  `,
})
export class UserAddComponent implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(AuthUsersService);
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
