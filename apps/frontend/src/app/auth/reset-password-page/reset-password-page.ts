import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, submit, required, email, FormField } from '@angular/forms/signals';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Alerts } from '@uxcommon/components/alerts/alerts';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

@Component({
  selector: 'pc-reset-password',
  imports: [FormField, Alerts],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  private _loading = createLoadingGate();
  private alertSvc = inject(AlertService);
  private authService = inject(AuthService);
  private router = inject(Router);

  protected readonly isLoading = this._loading.visible;

  protected emailSent = signal(false);

  protected success: string | undefined;

  protected readonly payload = signal({
    email: '',
  });

  public readonly form = form(this.payload, (p) => {
    required(p.email);
    email(p.email);
  });

  public get email() {
    return this.form.email();
  }

  public async submit(event?: Event) {
    event?.preventDefault();

    const rawEmail = this.payload().email;
    const emailVal = rawEmail.trim().toLowerCase();

    if (rawEmail !== emailVal) {
      this.form.email().value.set(emailVal);
    }

    // force validation messages to appear
    this.form().markAsTouched();

    await submit(this.form, {
      action: async () => {
        const end = this._loading.begin();
        try {
          await this.authService.sendPasswordResetEmail({ email: emailVal });
          this.alertSvc.showSuccess(
            "Password reset email sent. Please check your email in a minute or two (don't forget to check the spam folder).",
          );
          this.emailSent.set(true);
          this.router.navigateByUrl('signin');
        } catch (err: any) {
          this.alertSvc.showError(err.message || String(err));
        } finally {
          end();
        }
        return null;
      },
      onInvalid: () => {
        this.alertSvc.showError('Please check the email address and try again.');
      },
    });
  }
}
