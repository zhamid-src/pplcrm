/**
 * Component handling user sign-in with form validation and persistence options.
 */
import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { Alerts } from '@uxcommon/alerts/alerts';
import { Icon } from '@uxcommon/icon';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { TokenService } from 'apps/frontend/src/app/backend-svc/token-service';

/**
 * Sign-in page component for user login.
 * Includes reactive form handling, basic validation, and token persistence control.
 */
@Component({
  selector: 'pc-login',
  imports: [ReactiveFormsModule, RouterLink, Icon, Alerts],
  templateUrl: './signin-page.html',
})
export class SignInPage {
  private readonly alertSvc = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
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
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  /**
   * Redirects to the dashboard if an authenticated user revisits the sign-in page.
   */
  constructor() {
    effect(() => {
      if (this.authService.getUser()) this.router.navigate(['console', 'summary']);
    });
  }

  /**
   * Returns the form control for email.
   * @returns The email AbstractControl
   */
  public get email() {
    return this.form.get('email');
  }

  /**
   * Returns the form control for password.
   * @returns The password AbstractControl
   */
  public get password() {
    return this.form.get('password');
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
    // if we're here then we should clear the auth token
    this.tokenService.clearAll();

    if (this.form.invalid) return this.alertSvc.showError('Please enter a valid email and password.');

    this.loading.set(true);

    return this.authService
      .signIn({ email: this.email?.value || '', password: this.password?.value || '' })
      .catch((err) => this.alertSvc.showError(err.message))
      .finally(() => this.loading.set(false));
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
