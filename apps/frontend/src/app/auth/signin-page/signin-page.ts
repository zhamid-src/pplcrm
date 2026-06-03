import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AbstractControl, ValidatorFn } from '@angular/forms';
import { form, submit, required, email, minLength, pattern, FormField } from '@angular/forms/signals';
import { JSendFailError } from '@common';
import { Icon } from '@icons/icon';
import { TokenService } from '../../services/api/token-service';
import { TRPCClientError } from '@trpc/client';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { AuthLayoutComponent } from 'apps/frontend/src/app/auth/auth-layout';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

/**
 * Sign-in page component providing comprehensive user authentication interface.
 *
 * This component handles the complete sign-in flow including:
 * - Signal-based form validation for email and password
 * - Password visibility toggle for better UX
 * - Token persistence options (localStorage vs sessionStorage)
 * - Loading states and error handling
 * - Automatic redirection for already authenticated users
 * - 2FA verification flow with OTP passcode
 *
 * @example
 * ```html
 * <!-- Used in routing -->
 * <pc-login></pc-login>
 * ```
 */
@Component({
  selector: 'pc-login',
  imports: [FormField, RouterLink, Icon, AuthLayoutComponent],
  templateUrl: './signin-page.html',
})
export class SignInPage {
  private readonly alertSvc = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);

  /** Signal indicating whether login loading is in progress */
  private _loading = createLoadingGate();

  protected isLoading = this._loading.visible;

  /** Reference to token persistence setting (localStorage vs session) */
  protected persistence = this.tokenService.getPersistence();

  /** Signal indicating whether 2FA verification is currently required */
  protected readonly requires2FA = signal<boolean>(false);

  /** Email address for the pending 2FA verification */
  protected readonly emailFor2FA = signal<string>('');

  /** Model capturing credentials */
  protected readonly credentials = signal({
    email: '',
    password: '',
  });

  /** Signal-based form with validations */
  public readonly form = form(this.credentials, (p) => {
    required(p.email);
    email(p.email);
    required(p.password);
    minLength(p.password, 8);
  });

  /** Model capturing OTP data */
  protected readonly otpData = signal({
    code: '',
  });

  /** Signal-based OTP form with validations */
  public readonly otpForm = form(this.otpData, (p) => {
    required(p.code);
    pattern(p.code, /^\d{6}$/);
  });

  /**
   * Redirects to the dashboard if an authenticated user revisits the sign-in page.
   */
  constructor() {
    effect(() => {
      const user = this.authService.getUserSignal();
      if (user()) void this.router.navigate(['summary']);
    });
  }

  public get email() {
    return this.form.email();
  }

  public get password() {
    return this.form.password();
  }

  public get code() {
    return this.otpForm.code();
  }

  /**
   * Submits the form to perform user sign-in.
   * Shows error if form is invalid or authentication fails.
   */
  public async signIn(event?: Event) {
    event?.preventDefault();

    // clear any stale auth
    this.tokenService.clearAll();

    // normalize inputs
    const rawEmail = this.credentials().email;
    const emailVal = rawEmail.trim().toLowerCase();
    const passwordVal = this.credentials().password;

    // write back the normalized email (no revalidate spam)
    if (rawEmail !== emailVal) {
      this.form.email().value.set(emailVal);
    }

    // force validation messages to appear
    this.form().markAsTouched();

    await submit(this.form, {
      action: async () => {
        const end = this._loading.begin();
        try {
          const res = await this.authService.signIn({ email: emailVal, password: passwordVal });
          if (res.requires2FA) {
            this.requires2FA.set(true);
            this.emailFor2FA.set(res.email || emailVal);
            this.otpData.update((o) => ({ ...o, code: '' }));
          }
        } catch (err) {
          if (err instanceof JSendFailError) {
            const message = err.data['message'] ?? 'Unable to sign in.';
            this.alertSvc.showError(message);
          } else if (err instanceof TRPCClientError) {
            this.alertSvc.showError(err.message);
          } else {
            this.alertSvc.showError(err instanceof Error ? err.message : String(err));
          }
        } finally {
          end();
        }
        return null;
      },
      onInvalid: () => {
        const emailField = this.form.email();
        const passwordField = this.form.password();

        const hasEmailRequired = emailField.errors().some((e) => e.kind === 'required');
        const hasEmailFormat = emailField.errors().some((e) => e.kind === 'email');
        const hasPasswordMinLength = passwordField.errors().some((e) => e.kind === 'minLength');

        const msg = hasEmailRequired
          ? 'Email is required.'
          : hasEmailFormat
            ? 'Please enter a valid email address.'
            : hasPasswordMinLength
              ? 'Password must be at least 8 characters.'
              : 'Please enter a valid email and password.';
        this.alertSvc.showError(msg);
      },
    });
  }

  /**
   * Submits the 2FA verification code.
   */
  public async verify2FA(event?: Event) {
    event?.preventDefault();

    this.otpForm().markAsTouched();

    await submit(this.otpForm, {
      action: async () => {
        const end = this._loading.begin();
        try {
          const emailVal = this.emailFor2FA();
          const codeVal = this.otpData().code.trim();
          await this.authService.verify2FA({ email: emailVal, code: codeVal });
        } catch (err) {
          if (err instanceof JSendFailError) {
            const message = err.data['message'] ?? 'Verification failed.';
            this.alertSvc.showError(message);
          } else if (err instanceof TRPCClientError) {
            this.alertSvc.showError(err.message);
          } else {
            this.alertSvc.showError(err instanceof Error ? err.message : String(err));
          }
        } finally {
          end();
        }
        return null;
      },
      onInvalid: () => {
        const codeField = this.otpForm.code();
        const hasCodeRequired = codeField.errors().some((e) => e.kind === 'required');
        const hasCodePattern = codeField.errors().some((e) => e.kind === 'pattern');

        const msg = hasCodeRequired
          ? 'Verification code is required.'
          : hasCodePattern
            ? 'Verification code must be exactly 6 digits.'
            : 'Please enter a valid verification code.';
        this.alertSvc.showError(msg);
      },
    });
  }

  /**
   * Cancels the 2FA flow and goes back to standard credentials sign-in.
   */
  public cancel2FA() {
    this.requires2FA.set(false);
    this.emailFor2FA.set('');
    this.otpData.update((o) => ({ ...o, code: '' }));
  }

  /**
   * Toggles whether to persist auth token in localStorage or sessionStorage.
   * @param target - The checkbox input element
   */
  public togglePersistence(target: EventTarget | null) {
    if (!target) return;
    this.tokenService.setPersistence((target as HTMLInputElement).checked);
  }
}

export function emailSafeValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const v = (control.value ?? '').toString().trim();
    return v && EMAIL_SAFE.test(v) ? null : { email: true };
  };
}

const EMAIL_SAFE = /^(?!.*\.\.)(?!.*\.$)[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
