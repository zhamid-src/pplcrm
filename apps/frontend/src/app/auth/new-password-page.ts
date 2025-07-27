import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { PasswordCheckerModule } from '@triangular/password-checker';
import { TRPCError } from '@trpc/server';
import { Alerts } from '@uxcommon/alerts';
import { AlertService } from '@uxcommon/alert-service';
import { Icon } from '@uxcommon/icon';

import { firstValueFrom } from 'rxjs';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

@Component({
  selector: 'pc-new-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordCheckerModule, Icon, Alerts],
  templateUrl: './new-password-page.html',
})
export class NewPasswordPage implements OnInit {
  private alertSvc = inject(AlertService);
  private authService = inject(AuthService);

  /** Reset code extracted from query params */
  private code: string | null = null;
  private fb = inject(FormBuilder);

  /** Flag to control password visibility toggle */
  private hidePassword = true;
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Error state to control UI feedback */
  protected error = signal(false);

  /** Processing state to disable UI and show loading indication */
  protected processing = signal(false);

  /** Success message to show after successful password reset */
  protected success: string | undefined;

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

  public async ngOnInit() {
    const params: Params = await firstValueFrom(this.route.queryParams);

    if (!params['code']) {
      this.error.set(true);
    }

    this.code = params['code'];
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

    this.processing.set(true);
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
      this.processing.set(false);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this?.password?.errors as any)?.pwnedPasswordOccurrence;
  }
}
