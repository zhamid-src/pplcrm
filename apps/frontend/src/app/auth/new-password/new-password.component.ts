import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Params, Router, RouterLink } from "@angular/router";
import { AuthService } from "@services/auth.service.js";
import { PplCrmToastrService } from "@services/pplcrm-toast.service";
import { PasswordCheckerModule } from "@triangular/password-checker";
import { TRPCError } from "@trpc/server";
import { IconsComponent } from "@uxcommon/icons/icons.component";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "pc-new-password",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PasswordCheckerModule,
    IconsComponent,
  ],
  templateUrl: "./new-password.component.html",
  styleUrl: "./new-password.component.scss",
})
export class NewPasswordComponent implements OnInit {
  private code: string | null = null;

  private hidePassword = true;

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
    private toast: PplCrmToastrService,
  ) {}

  public get password() {
    return this.form.get("password");
  }

  public async ngOnInit() {
    const params: Params = await firstValueFrom(this.route.queryParams);

    if (!params["code"]) {
      this.error.set(true);
    }

    this.code = params["code"];
  }

  public async submit() {
    if (!this.password?.valid) {
      this.toast.error("Please check the password.");
      return;
    }
    this.toast.clear();
    this.processing.set(true);

    const error: TRPCError | null = await this.authService.resetPassword({
      code: this.code as string,
      password: this.password?.value as string,
    });

    if (error) {
      this.error.set(true);
    }

    this.processing.set(false);
    this.toast.success("Password reset successfully. Please sign in again");
    this.router.navigateByUrl("signin");
  }

  protected passwordBreachNumber() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.password?.errors as any)?.pwnedPasswordOccurrence;
  }

  protected passwordInBreach() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this?.password?.errors as any)?.pwnedPasswordOccurrence;
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
