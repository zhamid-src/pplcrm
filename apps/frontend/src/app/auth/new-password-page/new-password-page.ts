/**
 * Component allowing a user to set a new password using a reset code.
 */
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { PasswordCheckerModule } from '@triangular/password-checker';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { Alerts } from '@uxcommon/alerts/alerts';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

@Component({
  selector: 'pc-new-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordCheckerModule, Icon, Alerts],
  templateUrl: './new-password-page.html',
})
/**
 * Page component presenting a form to choose a new password.
 */
export class NewPasswordPage implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Reset code extracted from query params */
  private code: string | null = null;

  /** Flag to control password visibility toggle */
  private hidePassword = true;

  /** Error state to control UI feedback */
  protected readonly error = signal(false);

  /** loading state to disable UI and show loading indication */
  protected readonly loading = signal(false);

  /** Success message to show after successful password reset */
  protected success: string | undefined;

  /** Reactive form with the new password control */
  public form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  /**
   * Get the password form control.
   */
  public get password() {
    return this.form.get('password');
  }

  /**
   * Get the appropriate input type based on password visibility state.
   * @returns `'password'` or `'text'`
   */
  public getVisibility() {
    return this.hidePassword ? 'password' : 'text';
  }

  /**
   * Get the icon name for password visibility toggle.
   * @returns `'eye-slash'` or `'eye'`
   */
  public getVisibilityIcon() {
    return this.hidePassword ? 'eye-slash' : 'eye';
  }

  /**
   * Initializes component state by reading the reset code from the URL.
   */
  public async ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code');

    if (!code) {
      this.error.set(true);
      return;
    }

    this.code = code;
  }

  /**
   * Submit the new password to the server.
   * Validates the input and shows success or error messages accordingly.
   */
  public async submit() {
    if (!this.password?.valid || !this.password.value) {
      this.alertSvc.showError('Please check the password.');
      return;
    }

    this.loading.set(true);
    try {
      const error = await this.authService.resetPassword({
        code: this.code || '',
        password: this.password.value,
      });

      if (error) this.error.set(true);
      else {
        this.alertSvc.showSuccess('Password reset successfully. Please sign in again');
        this.router.navigateByUrl('signin');
      }
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Toggle the visibility of the password input.
   */
  public toggleVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  /**
   * Get the number of known password breaches for the entered password (if any).
   * Uses third-party library, so the error object is typed as `any`.
   *
   * @returns Number of password breaches or undefined
   */
  protected passwordBreachNumber() {
    // This uses an external library. I can't find any exported interface that
    // has the pwnedPasswordOccurrence property, so I am forced to use 'as any'
    return (this.password?.errors as any)?.pwnedPasswordOccurrence;
  }

  /**
   * Check whether the password was found in a known data breach.
   * Uses third-party library, so the error object is typed as `any`.
   *
   * @returns True if password is in a breach, false otherwise
   */
  protected passwordInBreach() {
    // This uses an external library. I can't find any exported interface that
    // has the pwnedPasswordOccurrence property, so I am forced to use 'as any'
    return (this?.password?.errors as any)?.pwnedPasswordOccurrence;
  }
}
