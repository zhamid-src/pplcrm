import { Component, inject, signal } from '@angular/core';
import { form, required, email, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

import { AuthUsersService } from '../services/authusers-service';

@Component({
  selector: 'pc-user-add',
  imports: [FormField],
  template: `
    <section class="max-w-xl space-y-4 m-4">
      <header>
        <h1 class="text-2xl font-semibold">Invite User</h1>
        <p class="text-sm text-muted">Send an invitation to add a new teammate to this tenant.</p>
      </header>

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
          <input
            id="role"
            type="text"
            class="w-full rounded border border-border px-3 py-2"
            [formField]="form.role"
            placeholder="e.g. admin"
          />
        </div>

        @if (error()) {
          <p class="text-sm text-danger">{{ error() }}</p>
        }

        <div class="flex gap-3 float-right">
          <button
            type="submit"
            class=" btn rounded btn-primary px-4 py-2 text-white"
            [disabled]="form().invalid() || submitting()"
          >
            {{ submitting() ? 'Sending…' : 'Send Invite' }}
          </button>
          <button type="button" class=" btn btn-error rounded border border-border px-4 py-2" (click)="cancel()">
            Cancel
          </button>
        </div>
      </form>
    </section>
  `,
})
export class UserAddComponent {
  private readonly alerts = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(AuthUsersService);

  protected readonly error = signal<string | null>(null);

  protected readonly payload = signal({
    email: '',
    first_name: '',
    last_name: '',
    role: '',
  });

  protected readonly form = form(this.payload, (p) => {
    required(p.email);
    email(p.email);
    required(p.first_name);
  });

  protected readonly submitting = signal(false);

  protected cancel() {
    void this.router.navigate(['../'], { relativeTo: this.route });
  }

  protected async submit(event?: Event) {
    if (event) {
      event.preventDefault();
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
      this.alerts.showSuccess('Invitation sent');
      this.form().reset();
      await this.router.navigate(['../'], { relativeTo: this.route });
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
