import { CommonModule } from "@angular/common";
import { Component, effect, signal } from "@angular/core";
// eslint-disable-next-line @typescript-eslint/no-unused-vars

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import { Router, RouterLink } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { AuthService } from "../services/auth.service.js";
import { TokenService } from "../services/token.service.js";

@Component({
  selector: "pplcrm-login",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.scss",
})
export class LoginComponent {
  protected processing = signal(false);
  protected persistence = this.tokenService.persistence;

  public form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
  });
  public hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router,
  ) {
    effect(() => {
      if (this.authService.user()) {
        this.router.navigateByUrl("console");
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
}
