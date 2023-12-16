import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { RouterLink } from "@angular/router";
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
  protected emailSent = signal(false);
  protected processing = signal(false);

  public form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
  ) {}

  public get email() {
    return this.form.get("email");
  }

  public async submit() {
    if (!this.email?.valid) {
      this.toastr.error("Please check the email address.");
      return;
    }

    this.toastr.clear();
    this.processing.set(true);

    this.processing.set(false);
  }
}
