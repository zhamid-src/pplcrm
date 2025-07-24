import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Alert } from '@uxcommon/alert';
import { AlertService } from '@uxcommon/alert-service';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

/**
 * Component for sending a password reset email.
 * Allows users to enter their email and request a reset link.
 */
@Component({
  selector: 'pc-reset-password',
  imports: [ReactiveFormsModule, Alert],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  private alertSvc = inject(AlertService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  /** Signal tracking whether the email has been sent */
  protected emailSent = signal(false);

  /** Signal indicating whether the form is processing */
  protected processing = signal(false);

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
    if (!this.email?.valid) {
      return this.alertSvc.showError('Please check the email address and try again.');
    }
    this.processing.set(true);

    await this.authService
      .sendPasswordResetEmail({
        email: this.email.value as string,
      })
      .catch((err) => this.alertSvc.showError(err.message));

    this.alertSvc.showSuccess(
      "Password reset email sent. Please check your email in a minute or two (don't forget to check the spam folder).",
    );
    this.processing.set(false);
    this.router.navigateByUrl('signin');
  }
}
