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
import { TokenService } from "@services/token.service.js";
import { ToastrService } from "ngx-toastr";

@Component({
  selector: "pplcrm-login",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    IconsComponent,
  ],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.scss",
})
export class LoginComponent {
  protected persistence = this.tokenService.persistence;
  protected processing = signal(false);

  public form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
  });
  protected hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router,
  ) {
    effect(() => {
      if (this.authService.user()) {
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
    if (!(this.email?.valid && this.password?.valid)) {
      this.toastr.error("Bad password");
      return;
    }

    this.toastr.clear();
    this.processing.set(true);

    return this.authService
      .signIn({
        email: this.email.value as string,
        password: this.password.value as string,
      })
      .catch((err) => this.toastr.error(err.message))
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
