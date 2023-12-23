import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "@services/auth.service.js";
import { PplCrmToastrService } from "@services/pplcrm-toast.service";

@Component({
  selector: "pc-reset-password",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./reset-password.component.html",
  styleUrl: "./reset-password.component.scss",
})
export class ResetPasswordComponent {
  protected emailSent = signal(false);
  protected processing = signal(false);

  public form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private toast: PplCrmToastrService,
    private authService: AuthService,
    private router: Router,
  ) {}

  public get email() {
    return this.form.get("email");
  }

  public async submit() {
    if (!this.email?.valid) {
      this.toast.error("Please check the email address.");
      return;
    }

    this.toast.clear();
    this.processing.set(true);

    await this.authService.sendPasswordResetEmail({
      email: this.email.value as string,
    });

    this.toast.success(
      "Password reset email sent. Please check your email in a minute or two (don't forget to check the spam folder).",
    );
    this.processing.set(false);
    this.router.navigateByUrl("signin");
  }
}
