import { Component, effect, signal, inject } from '@angular/core';
import { IconsComponent } from '@uxcommon/icons.component';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';
import { AlertService } from '@uxcommon/alert-service';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { TokenService } from 'apps/frontend/src/app/data/token-service';
import { Alert } from '@uxcommon/alert';

@Component({
  selector: 'pc-login',
  imports: [ReactiveFormsModule, RouterLink, IconsComponent, Alert],
  templateUrl: './signin-page.html',
})
export class SignInPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private alertSvc = inject(AlertService);

  public form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected hidePassword = true;
  protected persistence = this.tokenService.persistence;
  protected processing = signal(false);

  constructor() {
    effect(() => {
      if (this.authService.user()) this.router.navigate(['console', 'summary']);
    });
  }

  public get email() {
    return this.form.get('email');
  }

  public get password() {
    return this.form.get('password');
  }

  public getVisibility() {
    return this.hidePassword ? 'password' : 'text';
  }

  public getVisibilityIcon() {
    return this.hidePassword ? 'eye-slash' : 'eye';
  }

  public async signIn() {
    // if we're here then we should clear the auth token
    this.tokenService.clearAll();

    if (this.form.invalid) return this.alertSvc.showError('Please enter a valid email and password.');

    this.processing.set(true);

    // We know that email and password are defined because of the form validation
    // So we can safely use non-null assertion here

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const email = this.email!.value!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const password = this.password!.value!;

    return this.authService
      .signIn({ email, password })
      .catch((err) => this.alertSvc.showError(err.message))
      .finally(() => this.processing.set(false));
  }

  public togglePersistence(target: EventTarget | null) {
    if (!target) return;
    this.tokenService.persistence = (target as HTMLInputElement).checked;
  }

  public toggleVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  protected getError() {
    return this.form?.errors ? this.form?.errors['message'] : null;
  }

  protected hasError() {
    return this.getError()?.length;
  }
}
