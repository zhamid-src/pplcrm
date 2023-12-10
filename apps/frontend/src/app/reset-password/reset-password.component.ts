import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { RouterLink } from "@angular/router";
import * as common from "@common";
import { ToastrService } from "ngx-toastr";
import { AuthService } from "../services/auth.service.js";

@Component({
  selector: "pplcrm-reset-password",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./reset-password.component.html",
  styleUrl: "./reset-password.component.scss",
})
export class ResetPasswordComponent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  // #region Properties (3)

  protected processing = signal(false);
  protected emailSent = signal(false);

  public form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
  });

  // #endregion Properties (3)

  // #region Constructors (1)

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
  ) {}

  // #endregion Constructors (1)

  // #region Public Accessors (2)

  public get email() {
    return this.form.get("email");
  }

  // #endregion Public Accessors (2)

  // #region Public Methods (2)

  public async submit() {
    if (!this.email?.valid) {
      this.toastr.error("Please check the email address.");
      return;
    }

    this.toastr.clear();
    this.processing.set(true);

    const payload: common.IPasswordResetPayload =
      await this.authService.resetPassword(this.email.value as string);

    if (payload?.error) {
      this.toastr.error(payload.error.message);
    } else {
      // Email sent
      this.emailSent.set(true);
    }

    this.processing.set(false);
  }

  // #endregion Public Methods (2)
}
