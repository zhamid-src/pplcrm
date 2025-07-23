import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { AlertService } from '@uxcommon/alert-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { PasswordCheckerModule } from '@triangular/password-checker';
import { TRPCError } from '@trpc/server';
import { Alert } from '@uxcommon/alert';
import { Icon } from '@uxcommon/icon';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'pc-new-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordCheckerModule, Icon, Alert],
  templateUrl: './new-password-page.html',
})
export class NewPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private alertSvc = inject(AlertService);

  public form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  /** Error state to control UI feedback */
  protected error = signal(false);

  /** Processing state to disable UI and show loading indication */
  protected processing = signal(false);

  /** Success message to show after successful password reset */
  protected success: string | undefined;

  /** Reset code extracted from query params */
  private code: string | null = null;

  /** Flag to control password visibility toggle */
  private hidePassword = true;

  /**
   * Get the password form control.
   */
  public get password() {
    return this.form.get('password');
  }

  public async ngOnInit() {
    const params: Params = await firstValueFrom(this.route.queryParams);

    if (!params['code']) {
      this.error.set(true);
    }

    this.code = params['code'];
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
   * Submit the new password to the server.
   * Validates the input and shows success or error messages accordingly.
   */
  public async submit() {
    if (!this.password?.valid) {
      this.alertSvc.showError('Please check the password.');
      return;
    }
    this.processing.set(true);

    const error: TRPCError | null = await this.authService.resetPassword({
      code: this.code as string,
      password: this.password?.value as string,
    });

    if (error) {
      this.error.set(true);
    }

    this.processing.set(false);
    this.alertSvc.showSuccess('Password reset successfully. Please sign in again');
    this.router.navigateByUrl('signin');
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
