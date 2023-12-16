import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { PasswordCheckerModule } from "@triangular/password-checker";
import { ToastrService } from "ngx-toastr";
import { AuthService } from "../services/auth.service.js";

@Component({
  selector: "pplcrm-new-password",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PasswordCheckerModule,
  ],
  templateUrl: "./new-password.component.html",
  styleUrl: "./new-password.component.scss",
})
export class NewPasswordComponent {
  protected error = signal(false);
  protected processing = signal(false);

  public form = this.fb.group({
    password: ["", [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
  ) {}

  public get password() {
    return this.form.get("password");
  }

  public async submit() {
    this.error.set(false);
    console.log("submitting");
    if (!this.password?.valid) {
      this.toastr.error("Please check the password.");
      return;
    }

    this.toastr.clear();
    this.processing.set(true);

    //const params: Params = await firstValueFrom(this.route.queryParams);
    //console.log(params);

    if (this.processing()) {
      this.error.set(true);
    }

    /*
    const fragment = await firstValueFrom(this.route.fragment);
    if (fragment) {
      const params = new URLSearchParams(fragment);

      if (params.get("refresh_token")) {
        const refresh_token = params.get("refresh_token");
        
        const payload = await this.authService.newPassword(
          this.password?.value as string,
          refresh_token as string,
        );

        if (payload?.error?.name === "AuthWeakPasswordError") {
          this.toastr.error(
            "Your password is weak. Please select a different password",
          );
          this.processing.set(false);
        } else if (
          payload?.error?.message ===
          "New password should be different from the old password."
        ) {
          this.toastr.error(payload.error.message);
          this.processing.set(false);
        } else if (!payload?.error) {
          this.router.navigateByUrl("/signin");
        }
      }
    }

    // if we're still processing then we had an error
    if (this.processing()) {
      this.error.set(true);
    }
    */
  }

  protected passwordBreachNumber() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.password?.errors as any)?.pwnedPasswordOccurrence;
  }

  protected passwordInBreach() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this?.password?.errors as any)?.pwnedPasswordOccurrence;
  }
}
