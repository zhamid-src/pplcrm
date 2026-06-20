import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { form, submit, required, minLength, FormField } from '@angular/forms/signals';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { AuthLayoutComponent } from 'apps/frontend/src/app/auth/auth-layout';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { passwordBreachNumber, passwordInBreach } from 'apps/frontend/src/app/auth/auth-utils';

@Component({
  selector: 'pc-new-password',
  imports: [DecimalPipe, FormField, RouterLink, AuthLayoutComponent, Icon],
  templateUrl: './new-password-page.html',
})
export class NewPasswordPage implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private _loading = createLoadingGate();

  private code: string | null = null;

  protected readonly error = signal(false);
  protected readonly isLoading = this._loading.visible;

  protected passwordBreachNumber = passwordBreachNumber;
  protected passwordInBreach = passwordInBreach;

  protected success: string | undefined;

  protected readonly payload = signal({
    password: '',
  });

  public readonly form = form(this.payload, (p) => {
    required(p.password);
    minLength(p.password, 8);
  });

  public get password() {
    return this.form.password();
  }

  public async ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code');
    console.log(code);

    if (!code) {
      this.error.set(true);
      return;
    }

    this.code = code;
  }

  public async submit(event?: Event) {
    event?.preventDefault();

    // force validation messages to appear
    this.form().markAsTouched();

    if (!this.form().valid) {
      this.alertSvc.showError('Please check the password.');
      return;
    }

    await submit(this.form, {
      action: async () => {
        const end = this._loading.begin();
        try {
          const passwordVal = this.payload().password;
          await this.authService.resetPassword({
            code: this.code || '',
            password: passwordVal,
          });

          this.alertSvc.showSuccess('Password reset successfully. Please sign in again');
          this.router.navigateByUrl('signin');
        } catch (err: any) {
          // Catch backend/network rejections properly
          this.alertSvc.showError(err?.message || 'Failed to reset password. Please try again.');
          this.error.set(true);
        } finally {
          end();
        }
        return null;
      },
      onInvalid: () => {
        this.alertSvc.showError('Please check the password.');
      },
    });
  }
}
