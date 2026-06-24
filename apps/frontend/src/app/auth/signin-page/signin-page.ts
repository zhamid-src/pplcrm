import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AbstractControl, ValidatorFn } from '@angular/forms';
import { form, submit, required, email, minLength, pattern, FormField } from '@angular/forms/signals';
import { TokenService } from '../../services/api/token-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { Icon } from '@icons/icon';

import { AuthLayoutComponent } from 'apps/frontend/src/app/auth/auth-layout';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

@Component({
  selector: 'pc-login',
  imports: [FormField, RouterLink, Icon, AuthLayoutComponent],
  templateUrl: './signin-page.html',
})
export class SignInPage implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);
  private readonly route = inject(ActivatedRoute);

  private _loading = createLoadingGate();

  protected readonly verificationPending = signal<boolean>(false);
  protected readonly pendingEmail = signal<string>('');
  protected readonly resending = signal<boolean>(false);

  protected isLoading = this._loading.visible;

  protected persistence = this.tokenService.getPersistence();

  protected readonly requires2FA = signal<boolean>(false);

  protected readonly emailFor2FA = signal<string>('');

  protected readonly credentials = signal({
    email: '',
    password: '',
  });

  public readonly form = form(this.credentials, (p) => {
    required(p.email);
    email(p.email);
    required(p.password);
    minLength(p.password, 8);
  });

  protected readonly otpData = signal({
    code: '',
  });

  public readonly otpForm = form(this.otpData, (p) => {
    required(p.code);
    pattern(p.code, /^\d{6}$/);
  });

  constructor() {
    effect(() => {
      const user = this.authService.getUserSignal();
      if (user()) void this.router.navigate(['summary']);
    });
  }

  public ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('emailChanged') === 'true') {
      const emailVal = params.get('email') || '';
      this.verificationPending.set(true);
      this.pendingEmail.set(emailVal);
    }
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

    // clear previous pending states
    this.verificationPending.set(false);

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
        } catch (err: any) {
          const message = err.message || String(err);
          if (message.toLowerCase().includes('not verified')) {
            this.verificationPending.set(true);
            this.pendingEmail.set(emailVal);
          }
          this.alertSvc.showError(message);
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
        } catch (err: any) {
          this.alertSvc.showError(err.message || String(err));
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

  public cancel2FA() {
    this.requires2FA.set(false);
    this.emailFor2FA.set('');
    this.otpData.update((o) => ({ ...o, code: '' }));
  }

  public async signInWithPasskey() {
    const end = this._loading.begin();
    try {
      const result = await this.authService.signInWithPasskey();
      if (result.cancelled) return;
      if (!result.user) throw new Error('Passkey authentication failed. Please try again.');
    } catch (err: any) {
      this.alertSvc.showError(err.message || 'Passkey sign-in failed. Please try again.');
    } finally {
      end();
    }
  }

  public async resendVerification() {
    const emailVal = this.pendingEmail().trim();
    if (!emailVal) return;
    this.resending.set(true);
    try {
      await this.authService.resendVerificationEmail(emailVal);
      this.alertSvc.showSuccess('Verification email sent successfully!');
    } catch (err: any) {
      this.alertSvc.showError(err.message || 'Failed to resend verification email.');
    } finally {
      this.resending.set(false);
    }
  }

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
