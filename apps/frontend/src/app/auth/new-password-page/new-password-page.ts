/**
 * Component allowing a user to set a new password using a reset code.
 */
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

import { AuthLayoutComponent } from 'apps/frontend/src/app/auth/auth-layout';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { passwordBreachNumber, passwordControl, passwordInBreach } from 'apps/frontend/src/app/auth/auth-utils';
import { PasswordInputComponent } from 'apps/frontend/src/app/auth/password-input';

@Component({
  selector: 'pc-new-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthLayoutComponent, PasswordInputComponent],
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

  /** Error state to control UI feedback */
  protected readonly error = signal(false);

  /** loading state to disable UI and show loading indication */
  protected readonly loading = signal(false);

  /** Utilities for password breach checking */
  protected passwordBreachNumber = passwordBreachNumber;
  protected passwordInBreach = passwordInBreach;

  /** Success message to show after successful password reset */
  protected success: string | undefined;

  /** Reactive form with the new password control */
  public form = this.fb.group({
    password: passwordControl(this.fb),
  });

  /**
   * Get the password form control.
   */
  public get password(): FormControl {
    return this.form.get('password') as FormControl;
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
}
