import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";

import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  Validators,
} from "@angular/forms";
import { AuthErrors } from "@common/types.js";
import { ToastrService } from "ngx-toastr";
import { AuthService } from "../services/auth.service.js";

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
    /*
    if (!(this.email?.valid && this.password?.valid)) {
      this.toastr.info("Please check your email and password.");
      return;
    }

    this.toastr.clear();
    this.processing.set(true);

    const payload: Partial<IAuthUser> = await this.authService.signIn({
      email: this.email.value,
      password: this.password.value,
    });

    if (payload?.error) {
      console.log("error", payload?.error);
      this.toastr.error(this.mapErrorToString(payload.error));
    } else {
      console.log(AuthService.user);
    }

    this.processing.set(false);
    */
  }

  mapErrorToString(error: AuthErrors) {
    return error === AuthErrors.BadLogin
      ? "Check your email address"
      : error === AuthErrors.EmailNotConfirmed
        ? "Your email is not confirmed. Please check your email."
        : error === AuthErrors.InvalidRefreshToken ||
            AuthErrors.AdminTokenRequired ||
            AuthErrors.MissingInformation
          ? "Please log in again"
          : AuthErrors.BadPassword
            ? "Please check your password and try again"
            : "Sorry, could not log you in. Please check your network connection, email and password.";
  }

  get email() {
    return this.form.get("email");
  }

  get password() {
    return this.form.get("password");
  }

  toggleLoggedIn(_event: any) {}
}
