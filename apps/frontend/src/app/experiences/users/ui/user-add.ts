import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

import { AuthUsersService } from '../services/authusers-service';

@Component({
  selector: 'pc-user-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="max-w-xl space-y-4 m-4">
      <header>
        <h1 class="text-2xl font-semibold">Invite User</h1>
        <p class="text-sm text-muted">Send an invitation to add a new teammate to this tenant.</p>
      </header>

      <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
        <div class="space-y-1">
          <label class="block text-sm font-medium" for="email">Email</label>
          <input
            id="email"
            type="email"
            class="w-full rounded border border-border px-3 py-2"
            formControlName="email"
            autocomplete="email"
          />
          @if (isInvalid('email')) {
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
              formControlName="first_name"
              autocomplete="given-name"
            />
            @if (isInvalid('first_name')) {
              <p class="text-sm text-danger">First name is required.</p>
            }
          </div>

          <div class="space-y-1">
            <label class="block text-sm font-medium" for="last_name">Last name</label>
            <input
              id="last_name"
              type="text"
              class="w-full rounded border border-border px-3 py-2"
              formControlName="last_name"
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
            formControlName="role"
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
            [disabled]="form.invalid || submitting()"
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
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(AuthUsersService);

  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    first_name: ['', [Validators.required]],
    last_name: [''],
    role: [''],
  });
  protected readonly submitting = signal(false);

  protected cancel() {
    void this.router.navigate(['../'], { relativeTo: this.route });
  }

  protected isInvalid(control: string) {
    const ctl = this.form.get(control);
    return !!ctl && ctl.invalid && (ctl.dirty || ctl.touched);
  }

  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      const payload = this.toPayload();
      await this.users.add(payload);
      this.alerts.showSuccess('Invitation sent');
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
    const raw = this.form.getRawValue();
    return {
      email: raw.email?.trim() ?? '',
      first_name: raw.first_name?.trim() ?? '',
      last_name: raw.last_name?.trim() ? raw.last_name.trim() : null,
      role: raw.role?.trim() ? raw.role.trim() : null,
    };
  }
}
