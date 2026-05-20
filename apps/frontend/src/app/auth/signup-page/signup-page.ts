import { DecimalPipe } from '@angular/common';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { form, submit, required, email, minLength, FormField } from '@angular/forms/signals';
import { Router, RouterModule } from '@angular/router';
import { IAuthUser, signUpInputType } from '@common';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { AuthLayoutComponent } from 'apps/frontend/src/app/auth/auth-layout';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { passwordBreachNumber, passwordInBreach } from 'apps/frontend/src/app/auth/auth-utils';

/**
 * Component responsible for user sign-up.
 * Provides a form with validation, password visibility toggling,
 * and integration with a password breach checker.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'pc-signup',
  imports: [DecimalPipe, FormField, Icon, RouterModule, AuthLayoutComponent],
  templateUrl: './signup-page.html',
})
export class SignUpPage {
  private readonly alertSvc = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Signal indicating whether form submission is in progress */
  private _loading = createLoadingGate();

  /** Model capturing registration details */
  protected readonly signUpData = signal({
    organization: '',
    email: '',
    password: '',
    first_name: '',
    middle_names: '',
    last_name: '',
    terms: '',
  });

  /** Signal-based form with validation schema */
  public readonly form = form(this.signUpData, (p) => {
    required(p.organization);
    required(p.email);
    email(p.email);
    required(p.password);
    minLength(p.password, 8);
    required(p.first_name);
  });

  protected isLoading = this._loading.visible;

  /** Utilities for password breach checking */
  protected passwordBreachNumber = passwordBreachNumber;
  protected passwordInBreach = passwordInBreach;

  /**
   * Getter for the email form control.
   */
  public get email() {
    return this.form.email();
  }

  /**
   * Getter for the first name form control.
   */
  public get firstName() {
    return this.form.first_name();
  }

  /**
   * Getter for the organization form control.
   */
  public get organization() {
    return this.form.organization();
  }

  /**
   * Getter for the password form control.
   */
  public get password() {
    return this.form.password();
  }

  /**
   * Handles form submission for user registration.
   * Displays alerts for error or success states.
   */
  public async join(event?: Event) {
    event?.preventDefault();
    this.form().markAsTouched();

    await submit(this.form, {
      action: async () => {
        const end = this._loading.begin();
        try {
          const data = await this.authService.signUp(this.signUpData() as signUpInputType);
          const user = data as IAuthUser;
          if (user) {
            this.alertSvc.showSuccess(`Welcome ${user.first_name}!`);
            await this.router.navigate(['summary']);
          } else {
            this.alertSvc.showError('Unable to complete signup.');
          }
        } catch (err: any) {
          this.alertSvc.showError(err.message);
        } finally {
          end();
        }
        return null;
      },
      onInvalid: () => {
        this.alertSvc.showError('Please enter all information before continuing.');
      },
    });
  }
}
