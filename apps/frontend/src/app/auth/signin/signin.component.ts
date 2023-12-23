import { CommonModule } from "@angular/common";
import { Component, effect, signal } from "@angular/core";
import { IconsComponent } from "@uxcommon/icons/icons.component";

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import { Router, RouterLink } from "@angular/router";
import { AuthService } from "@services/auth.service.js";
import { PplCrmToastrService } from "@services/pplcrm-toast.service";
import { TokenService } from "@services/token.service.js";

@Component({
  selector: "pc-login",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    IconsComponent,
  ],
  templateUrl: "./signin.component.html",
  styleUrl: "./signin.component.scss",
})
export class SignInComponent {
  protected persistence = this.tokenService.persistence;
  protected processing = signal(false);

  public form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
  });
  protected hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private toast: PplCrmToastrService,
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router,
  ) {
    effect(() => {
      if (this.authService.user()) {
        this.toast.success(
          `Welcome back, ${this.authService.user()?.first_name}.`,
        );
        this.router.navigateByUrl("console/summary");
      }
    });
  }

  public get email() {
    return this.form.get("email");
  }

  public get password() {
    return this.form.get("password");
  }

  public async signIn() {
    if (this.form.invalid)
      return this.toast.error("Please enter a valid email and password.");

    this.toast.clear();
    this.processing.set(true);

    const email = this.email!.value!;
    const password = this.password!.value!;

    return this.authService
      .signIn({ email, password })
      .catch((err) => this.toast.error(err.message))
      .finally(() => this.processing.set(false));
  }

  public togglePersistence(target: EventTarget | null) {
    if (!target) return;
    this.tokenService.persistence = (target as HTMLInputElement).checked;
  }

  public getVisibility() {
    return this.hidePassword ? "password" : "text";
  }

  public toggleVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  public getVisibilityIcon() {
    return this.hidePassword ? "eye-slash" : "eye";
  }
}
