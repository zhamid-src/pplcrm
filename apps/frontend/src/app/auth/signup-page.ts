import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { signUpInputType } from '@common';
import { PasswordCheckerModule } from '@triangular/password-checker';
import { Alerts } from '@uxcommon/alerts';
import { AlertService } from '@uxcommon/alert-service';
import { Icon } from '@uxcommon/icon';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

/**
 * Component responsible for user sign-up.
 * Provides a form with validation, password visibility toggling,
 * and integration with a password breach checker.
 */
@Component({
  selector: 'pc-signup',
  imports: [CommonModule, PasswordCheckerModule, ReactiveFormsModule, Icon, RouterModule, Alerts],
  templateUrl: './signup-page.html',
})
export class SignUpPage {
  private alertSvc = inject(AlertService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  /** Reactive form with user registration fields */
  protected form = this.fb.group({
    organization: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    first_name: ['', [Validators.required]],
    middle_names: [''],
    last_name: [''],
    terms: [''],
  });

  /** Whether password input is hidden */
  protected hidePassword = true;

  /** Signal indicating whether form submission is in progress */
  protected processing = signal(false);

  /**
   * Getter for the email form control.
   * @returns The email AbstractControl
   */
  public get email() {
    return this.form.get('email');
  }

  /**
   * Getter for the first name form control.
   * @returns The first name AbstractControl
   */
  public get firstName() {
    return this.form.get('first_name');
  }

  /**
   * Getter for the organization form control.
   * @returns The organization AbstractControl
   */
  public get organization() {
    return this.form.get('organization');
  }

  /**
   * Getter for the password form control.
   * @returns The password AbstractControl
   */
  public get password() {
    return this.form.get('password');
  }

  /**
   * Returns input type for password field based on visibility toggle.
   * @returns 'password' or 'text'
   */
  public getVisibility() {
    return this.hidePassword ? 'password' : 'text';
  }

  /**
   * Returns icon name for visibility toggle.
   * @returns 'eye' or 'eye-slash'
   */
  public getVisibilityIcon() {
    return this.hidePassword ? 'eye-slash' : 'eye';
  }

  /**
   * Handles form submission for user registration.
   * Displays alerts for error or success states.
   */
  public async join() {
    if (this.form.invalid) return this.alertSvc.showError('Please enter all information before continuing.');

    this.processing.set(true);

    const formObj = this.form.getRawValue() as signUpInputType;

    return this.authService
      .signUp(formObj)
      .then((user) => {
        if (!user) {
          this.alertSvc.showError('Unknown error'); // TODO: better error msg
        }
      })
      .catch((err) => this.alertSvc.showError(err.message))
      .finally(() => this.processing.set(false));
  }

  /**
   * Toggles password visibility.
   */
  public toggleVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  /**
   * Returns the number of times the password was found in a data breach.
   * Requires external library support.
   * @returns Number of pwned password occurrences
   */
  protected passwordBreachNumber() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.password?.errors as any)?.pwnedPasswordOccurrence;
  }

  /**
   * Returns whether the password was found in a data breach.
   * Requires external library support.
   * @returns Truthy if password was breached, falsy otherwise
   */
  protected passwordInBreach() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this?.password?.errors as any)?.pwnedPasswordOccurrence;
  }
}
