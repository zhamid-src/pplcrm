/**
 * Component and form logic for user registration.
 */
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IAuthUser, signUpInputType } from '@common';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

import { AuthLayoutComponent } from 'apps/frontend/src/app/auth/auth-layout';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import {
  emailControl,
  passwordBreachNumber,
  passwordControl,
  passwordInBreach,
} from 'apps/frontend/src/app/auth/auth-utils';
import { PasswordInputComponent } from 'apps/frontend/src/app/auth/password-input';

/**
 * Component responsible for user sign-up.
 * Provides a form with validation, password visibility toggling,
 * and integration with a password breach checker.
 */
@Component({
  selector: 'pc-signup',
  imports: [CommonModule, ReactiveFormsModule, Icon, RouterModule, AuthLayoutComponent, PasswordInputComponent],
  templateUrl: './signup-page.html',
})
export class SignUpPage {
  private readonly alertSvc = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  /** Reactive form with user registration fields */
  protected form = this.fb.group({
    organization: ['', [Validators.required]],
    email: emailControl(this.fb),
    password: passwordControl(this.fb),
    first_name: ['', [Validators.required]],
    middle_names: [''],
    last_name: [''],
    terms: [''],
  });

  /** Signal indicating whether form submission is in progress */
  protected loading = signal(false);

  /** Utilities for password breach checking */
  protected passwordBreachNumber = passwordBreachNumber;
  protected passwordInBreach = passwordInBreach;

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
  public get password(): FormControl {
    return this.form.get('password') as FormControl;
  }

  /**
   * Handles form submission for user registration.
   * Displays alerts for error or success states.
   */
  public async join() {
    if (this.form.invalid) return this.alertSvc.showError('Please enter all information before continuing.');

    this.loading.set(true);

    // TODO: better error message
    return this.authService
      .signUp(this.form.getRawValue() as signUpInputType)
      .then((data) => {
        const user = data as IAuthUser;
        if (user) {
          this.alertSvc.showSuccess(`Welcome ${user.first_name}!`);
        } else {
          this.alertSvc.showError('Unable to complete signup.');
        }
      })
      .catch((err) => this.alertSvc.showError(err.message))
      .finally(() => this.loading.set(false));
  }
}
