/**
 * Component for initiating the password reset email flow.
 */
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Alerts } from '@uxcommon/components/alerts/alerts';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

/**
 * Component for sending a password reset email.
 * Allows users to enter their email and request a reset link.
 */
@Component({
  selector: 'pc-reset-password',
  imports: [ReactiveFormsModule, Alerts],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  private alertSvc = inject(AlertService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  /** Signal indicating whether the form is loading */
  private _loading = createLoadingGate();

  protected readonly isLoading = this._loading.visible;

  /** Signal tracking whether the email has been sent */
  protected emailSent = signal(false);

  /** Success message string */
  protected success: string | undefined;

  /** Reactive form with a single email input */
  public form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  /**
   * Getter for the email form control.
   * @returns The email AbstractControl from the form.
   */
  public get email() {
    return this.form.get('email');
  }

  /**
   * Submits the password reset request.
   * If the email is valid, it calls the AuthService and shows a success message.
   * Otherwise, shows an error message.
   */
  public async submit() {
    if (!this.email?.valid || !this.email.value)
      return this.alertSvc.showError('Please check the email address and try again.');

    const end = this._loading.begin();
    try {
      await this.authService
        .sendPasswordResetEmail({ email: this.email.value })
        .catch((err) => this.alertSvc.showError(err.message));

      this.alertSvc.showSuccess(
        "Password reset email sent. Please check your email in a minute or two (don't forget to check the spam folder).",
      );
      this.router.navigateByUrl('signin');
    } finally {
      end();
    }
  }
}
