/**
 * @fileoverview Sign-in page component providing user authentication interface.
 * Features reactive forms, validation, password visibility toggle, and token persistence options.
 */
import { Component, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JSendFailError } from '@common';
import { Icon } from '@icons/icon';
import { TRPCClientError } from '@trpc/client';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { Alerts } from '@uxcommon/alerts/alerts';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { TokenService } from '@services/api/token-service';

/**
 * Sign-in page component providing comprehensive user authentication interface.
 *
 * This component handles the complete sign-in flow including:
 * - Reactive form validation for email and password
 * - Password visibility toggle for better UX
 * - Token persistence options (localStorage vs sessionStorage)
 * - Loading states and error handling
 * - Automatic redirection for already authenticated users
 *
 * **Features:**
 * - Email format validation
 * - Password minimum length validation (8 characters)
 * - Real-time form validation feedback
 * - Secure password input with show/hide toggle
 * - Configurable token persistence for "Remember me" functionality
 *
 * @example
 * ```html
 * <!-- Used in routing -->
 * <pc-login></pc-login>
 * ```
 */
@Component({
  selector: 'pc-login',
  imports: [ReactiveFormsModule, RouterLink, Icon, Alerts],
  templateUrl: './signin-page.html',
})
export class SignInPage {
  private readonly alertSvc = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);

  /** Signal indicating whether login loading is in progress */
  protected readonly loading = signal(false);

  /** Controls whether the password is visible or masked */
  protected hidePassword = true;

  /** Reference to token persistence setting (localStorage vs session) */
  protected persistence = this.tokenService.getPersistence();

  /** Form group capturing the user's email and password */
  public form = this.fb.group({
    email: this.fb.control('', { validators: [Validators.required, Validators.email] }),
    password: this.fb.control('', { validators: [Validators.required, Validators.minLength(8)] }),
  });

  /**
   * Redirects to the dashboard if an authenticated user revisits the sign-in page.
   */
  constructor() {
    effect(() => {
      if (this.authService.getUser()) this.router.navigate(['console', 'summary']);
    });
  }

  public get email(): FormControl<string> {
    return this.form.controls.email;
  }

  public get password(): FormControl<string> {
    return this.form.controls.password;
  }

  /**
   * Returns input type based on visibility toggle.
   * @returns 'password' or 'text'
   */
  public getVisibility() {
    return this.hidePassword ? 'password' : 'text';
  }

  /**
   * Returns icon name for password visibility toggle.
   * @returns 'eye' or 'eye-slash'
   */
  public getVisibilityIcon() {
    return this.hidePassword ? 'eye-slash' : 'eye';
  }

  /**
   * Submits the form to perform user sign-in.
   * Shows error if form is invalid or authentication fails.
   */
  public async signIn() {
    // clear any stale auth
    this.tokenService.clearAll();

    // normalize inputs
    const rawEmail = (this.email?.value ?? '').toString();
    const email = rawEmail.trim().toLowerCase();
    const password = (this.password?.value ?? '').toString();

    // write back the normalized email (no revalidate spam)
    if (this.email && rawEmail !== email) {
      this.email.setValue(email, { emitEvent: false });
    }

    // force validation messages to appear
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity({ onlySelf: false, emitEvent: false });

    // block backend if invalid
    if (!email || !password || this.form.invalid) {
      const msg = this.email?.hasError('required')
        ? 'Email is required.'
        : this.email?.hasError('email')
          ? 'Please enter a valid email address.'
          : this.password?.hasError('minlength')
            ? 'Password must be at least 8 characters.'
            : 'Please enter a valid email and password.';
      this.alertSvc.showError(msg);
      return;
    }

    this.loading.set(true);
    try {
      await this.authService.signIn({ email, password });
    } catch (err) {
      // your existing error handling...
      if (err instanceof JSendFailError) {
        const message = err.data['message'] ?? 'Unable to sign in.';
        this.form.setErrors({ message });
        this.alertSvc.showError(message);
      } else if (err instanceof TRPCClientError) {
        this.form.setErrors({ message: err.message });
        this.alertSvc.showError(err.message);
      } else {
        this.alertSvc.showError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Toggles whether to persist auth token in localStorage or sessionStorage.
   * @param target - The checkbox input element
   */
  public togglePersistence(target: EventTarget | null) {
    if (!target) return;
    this.tokenService.setPersistence((target as HTMLInputElement).checked);
  }

  /**
   * Toggles the password visibility state.
   */
  public toggleVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  /**
   * Gets any custom form-level error messages.
   * @returns The error message or null
   */
  protected getError() {
    return this.form?.errors ? this.form?.errors['message'] : null;
  }

  /**
   * Checks if any form-level error exists.
   * @returns True if there's an error message; otherwise false
   */
  protected hasError() {
    return this.getError()?.length;
  }
}

export function emailSafeValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const v = (control.value ?? '').toString().trim();
    return v && EMAIL_SAFE.test(v) ? null : { email: true };
  };
}

const EMAIL_SAFE = /^(?!.*\.\.)(?!.*\.$)[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
