import { Component, signal, inject } from '@angular/core';

import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '@uxcommon/alert-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { Alert } from '@uxcommon/alert';

@Component({
  selector: 'pc-reset-password',
  imports: [FormsModule, ReactiveFormsModule, Alert],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertSvc = inject(AlertService);

  public form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected emailSent = signal(false);
  protected processing = signal(false);
  protected success: string | undefined;

  public get email() {
    return this.form.get('email');
  }

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
