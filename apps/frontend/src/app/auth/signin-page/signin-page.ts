import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { AbstractControl, ValidatorFn } from '@angular/forms';
import { FormField, email, form, minLength, pattern, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { TokenService } from '../../services/api/token-service';
import { AuthLayoutComponent } from 'apps/frontend/src/app/auth/auth-layout';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';

@Component({
  selector: 'pc-login',
  imports: [FormField, RouterLink, Icon, AuthLayoutComponent],
  templateUrl: './signin-page.html',
})
export class SignInPage implements OnInit, OnDestroy {
  private readonly alertSvc = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly suppressNavigation = signal<boolean>(false);
  private readonly tokenService = inject(TokenService);

  private _countdownInterval: ReturnType<typeof setInterval> | null = null;
  private _loading = createLoadingGate();

  protected readonly credentials = signal({
    email: '',
    password: '',
  });
  protected readonly emailFor2FA = signal<string>('');
  protected readonly offerPasskeySetup = signal<boolean>(false);
  protected readonly otpData = signal({
    code: '',
  });
  protected readonly pendingEmail = signal<string>('');
  protected readonly rateLimitSecondsLeft = signal<number>(0);
  protected readonly rateLimitMins = computed(() => Math.floor(this.rateLimitSecondsLeft() / 60));
  protected readonly rateLimitRemSecs = computed(() => this.rateLimitSecondsLeft() % 60);
  protected readonly requires2FA = signal<boolean>(false);
  protected readonly resending = signal<boolean>(false);
  protected readonly settingUpPasskey = signal<boolean>(false);
  protected readonly verificationPending = signal<boolean>(false);

  protected isLoading = this._loading.visible;
  protected persistence = this.tokenService.getPersistence();

  public readonly form = form(this.credentials, (p) => {
    required(p.email);
    email(p.email);
    required(p.password);
    minLength(p.password, 8);
  });
  public readonly otpForm = form(this.otpData, (p) => {
    required(p.code);
    pattern(p.code, /^\d{6}$/);
  });

  constructor() {
    effect(() => {
      const user = this.authService.getUserSignal();
      if (user() && !this.suppressNavigation()) void this.router.navigate(['summary']);
    });
  }

  public get code() {
    return this.otpForm.code();
  }

  public get email() {
    return this.form.email();
  }

  public get password() {
    return this.form.password();
  }

  public cancel2FA() {
    this.requires2FA.set(false);
    this.emailFor2FA.set('');
    this.otpData.update((o) => ({ ...o, code: '' }));
  }

  public ngOnDestroy() {
    this.clearCountdown();
  }

  public ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('emailChanged') === 'true') {
      const emailVal = params.get('email') || '';
      this.verificationPending.set(true);
      this.pendingEmail.set(emailVal);
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

  public async setupPasskey() {
    this.settingUpPasskey.set(true);
    try {
      const result = await this.authService.registerPasskey();
      if (result.verified) {
        this.alertSvc.showSuccess('Passkey set up successfully!');
      }
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        this.alertSvc.showError(err.message || 'Failed to set up passkey.');
      }
    } finally {
      this.settingUpPasskey.set(false);
      this.offerPasskeySetup.set(false);
      this.suppressNavigation.set(false);
    }
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
          this.suppressNavigation.set(true);
          const res = await this.authService.signIn({ email: emailVal, password: passwordVal });
          if (res.requires2FA) {
            this.suppressNavigation.set(false);
            this.requires2FA.set(true);
            this.emailFor2FA.set(res.email || emailVal);
            this.otpData.update((o) => ({ ...o, code: '' }));
          } else {
            const passkeys = (await this.authService.listPasskeys().catch(() => [])) as any[];
            if (passkeys.length === 0) {
              this.offerPasskeySetup.set(true);
            } else {
              this.suppressNavigation.set(false);
            }
          }
        } catch (err: any) {
          this.suppressNavigation.set(false);
          this.handleError(err, emailVal);
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

  public async signInWithPasskey() {
    const end = this._loading.begin();
    try {
      const result = await this.authService.signInWithPasskey();
      if (result.cancelled) return;
      if (!result.user) throw new Error('Passkey authentication failed. Please try again.');
    } catch (err: any) {
      this.handleError(err);
    } finally {
      end();
    }
  }

  public skipPasskeySetup() {
    this.offerPasskeySetup.set(false);
    this.suppressNavigation.set(false);
  }

  public togglePersistence(target: EventTarget | null) {
    if (!target) return;
    this.tokenService.setPersistence((target as HTMLInputElement).checked);
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
          this.handleError(err);
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

  private clearCountdown() {
    if (this._countdownInterval !== null) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
  }

  private handleError(err: any, emailVal?: string) {
    // errorLink wraps TRPCClientError in ApiError; tRPC data lives on originalError
    const tRPCData = err?.originalError?.data ?? err?.data;
    const message = err.message || String(err);
    const retryAfterSec = (tRPCData?.retryAfterSec as number | undefined) ?? this.parseRetryAfterSec(message);
    if (retryAfterSec) {
      this.startRateLimitCountdown(retryAfterSec);
      return;
    }
    const code = tRPCData?.code as string | undefined;
    if (emailVal && message.toLowerCase().includes('not verified')) {
      this.verificationPending.set(true);
      this.pendingEmail.set(emailVal);
      this.alertSvc.showError(message);
    } else if (emailVal && (code === 'UNAUTHORIZED' || code === 'NOT_FOUND')) {
      this.alertSvc.showError('Please check your email address and password and try again.');
    } else {
      this.alertSvc.showError(message);
    }
  }

  private parseRetryAfterSec(message: string): number | undefined {
    const match = message?.match(/retry in (\d+) second/i);
    return match ? parseInt(match[1]!, 10) : undefined;
  }

  private startRateLimitCountdown(seconds: number) {
    this.clearCountdown();
    this.rateLimitSecondsLeft.set(seconds);

    this._countdownInterval = setInterval(() => {
      const current = this.rateLimitSecondsLeft();
      if (current < 1) {
        this.clearCountdown();
      } else {
        this.rateLimitSecondsLeft.update((s) => s - 1);
      }
    }, 1000);
  }
}

export function emailSafeValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const v = (control.value ?? '').toString().trim();
    return v && EMAIL_SAFE.test(v) ? null : { email: true };
  };
}

const EMAIL_SAFE = /^(?!.*\.\.)(?!.*\.$)[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
