import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { IconsComponent } from '@uxcommon/icons/icons.component';

import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';
import { AlertService } from '@services/alert.service';
import { AuthService } from '@services/auth.service.js';
import { TokenService } from '@services/token.service.js';
import { AlertComponent } from '@uxcommon/alert/alert.component';

@Component({
  selector: 'pc-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    IconsComponent,
    AlertComponent,
  ],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.scss',
})
export class SignInComponent {
  public form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected hidePassword = true;
  protected persistence = this.tokenService.persistence;
  protected processing = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router,
    private alertSvc: AlertService,
  ) {
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
    if (this.form.invalid)
      return this.alertSvc.showError('Please enter a valid email and password.');

    this.processing.set(true);

    const email = this.email!.value!;
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
