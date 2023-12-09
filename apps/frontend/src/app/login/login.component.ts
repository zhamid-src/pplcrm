import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";
// eslint-disable-next-line @typescript-eslint/no-unused-vars

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { AuthService } from "../services/auth.service.js";

interface IAuthUser {
  // #region Properties (3)

  error: AuthErrors | null;
  session: unknown | null;
  user: unknown | null;

  // #endregion Properties (3)
}

enum AuthErrors {
  BadLogin = 1,
  EmailNotConfirmed,
  InvalidRefreshToken,
  AdminTokenRequired,
  MissingInformation,
  UserAlreadyRegistered,
  BadPassword,
  Unknown,
}

@Component({
  selector: "pplcrm-login",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.scss",
})
export class LoginComponent {
  // #region Properties (3)

  protected processing = signal(false);

  public form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
  });
  public hidePassword = true;

  // #endregion Properties (3)

  // #region Constructors (1)

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
    private router: Router,
  ) {}

  // #endregion Constructors (1)

  // #region Public Accessors (2)

  public get email() {
    return this.form.get("email");
  }

  public get password() {
    return this.form.get("password");
  }

  // #endregion Public Accessors (2)

  // #region Public Methods (2)

  public mapErrorToString(error?: AuthErrors) {
    switch (error) {
      case AuthErrors.InvalidRefreshToken:
      case AuthErrors.AdminTokenRequired:
        return "There was an error logging you in. Please try again.";
      case AuthErrors.BadPassword:
      case AuthErrors.MissingInformation:
        return "Please check your email and password";
      case AuthErrors.BadLogin:
      case AuthErrors.Unknown:
      default:
        return "Sorry, could not log you in. Please check your network connection, email and password. If the issue persists then contact us.";
    }
  }

  public async signIn() {
    if (!(this.email?.valid && this.password?.valid)) {
      this.toastr.error(this.mapErrorToString(AuthErrors.BadPassword));
      return;
    }

    this.toastr.clear();
    this.processing.set(true);

    const payload: Partial<IAuthUser> = await this.authService.signIn({
      email: this.email.value as string,
      password: this.password.value as string,
    });

    console.log("payload", payload);

    if (payload?.error) {
      if (payload?.error === AuthErrors.EmailNotConfirmed) {
        // TODO: continue to the 'verify email' component
      }
      this.toastr.error(this.mapErrorToString(payload.error));
    } else {
      this.router.navigateByUrl("/dashboard");
      console.log(AuthService.user);
    }

    this.processing.set(false);
  }

  // #endregion Public Methods (2)
}
