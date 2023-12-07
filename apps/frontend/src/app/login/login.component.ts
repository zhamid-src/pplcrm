import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";

import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  Validators,
} from "@angular/forms";

import { ToastrService } from "ngx-toastr";
import { AuthService } from "../services/auth.service.js";

interface IAuthUser {
  user: unknown | null;
  session: unknown | null;
  error: AuthErrors | null;
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
  hidePassword = true;
  protected processing = signal(false);
  form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private fb: UntypedFormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
  ) {}

  async signIn() {
    if (!(this.email?.valid && this.password?.valid)) {
      this.toastr.error(this.mapErrorToString(AuthErrors.BadPassword));
      return;
    }

    this.toastr.clear();
    this.processing.set(true);

    const payload: Partial<IAuthUser> = await this.authService.signIn({
      email: this.email.value,
      password: this.password.value,
    });

    if (payload?.error) {
      if (payload?.error === AuthErrors.EmailNotConfirmed) {
        // TODO: continue to the 'verify email' component
      }
      this.toastr.error(this.mapErrorToString(payload.error));
    } else {
      // TODO: The user is signed in.  Continue.
      console.log(AuthService.user());
    }

    this.processing.set(false);
  }

  mapErrorToString(error?: AuthErrors) {
    switch (error) {
      case AuthErrors.InvalidRefreshToken:
      case AuthErrors.AdminTokenRequired:
      case AuthErrors.MissingInformation:
        return "There was an error logging you in. Please try again.";
      case AuthErrors.BadPassword:
        return "Please check your password and try again";
      case AuthErrors.BadLogin:
      case AuthErrors.Unknown:
      default:
        return "Sorry, could not log you in. Please check your network connection, email and password. If the issue persists then contact us.";
    }
  }

  get email() {
    return this.form.get("email");
  }

  get password() {
    return this.form.get("password");
  }
}
