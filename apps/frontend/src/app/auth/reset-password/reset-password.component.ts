import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AlertService } from "@services/alert.service";
import { AuthService } from "@services/auth.service.js";
import { AlertComponent } from "@uxcommon/alert/alert.component";

@Component({
  selector: "pc-reset-password",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    AlertComponent,
  ],
  templateUrl: "./reset-password.component.html",
  styleUrl: "./reset-password.component.scss",
})
export class ResetPasswordComponent {
  protected emailSent = signal(false);
  protected processing = signal(false);
  protected success: string | undefined;

  public form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertSvc: AlertService,
  ) {}

  public get email() {
    return this.form.get("email");
  }

  public async submit() {
    if (!this.email?.valid) {
      this.setError("Please check the email address and try again.");
      return;
    }
    this.processing.set(true);

    await this.authService
      .sendPasswordResetEmail({
        email: this.email.value as string,
      })
      .catch((err) => this.setError(err.message));

    this.alertSvc.show({
      text: "Password reset email sent. Please check your email in a minute or two (don't forget to check the spam folder).",
      type: "success",
    });
    this.processing.set(false);
    this.router.navigateByUrl("signin");
  }
  protected setError(text: string) {
    this.alertSvc.show({ text, type: "error" });
  }
}
