import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { Component, signal } from "@angular/core";
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { IToken } from "@common";
import { AuthService, SignUpFormType } from "@services/auth.service.js";
import { PplCrmToastrService } from "@services/pplcrm-toast.service";
import { PasswordCheckerModule } from "@triangular/password-checker";
import { IconsComponent } from "@uxcommon/icons/icons.component";

@Component({
  selector: "pc-signup",
  standalone: true,
  imports: [
    CommonModule,
    PasswordCheckerModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    IconsComponent,
    RouterModule,
  ],
  templateUrl: "./signup.component.html",
  styleUrl: "./signup.component.scss",
})
export class SignUpComponent {
  protected form = this.fb.group({
    organization: ["", [Validators.required]],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    first_name: ["", [Validators.required]],
    middle_names: [""],
    last_name: [""],
    terms: [""],
  });

  protected processing = signal(false);
  protected hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private toast: PplCrmToastrService,
    private authService: AuthService,
    private router: Router,
  ) {}

  public get email() {
    return this.form.get("email");
  }

  public get firstName() {
    return this.form.get("first_name");
  }

  public get organization() {
    return this.form.get("organization");
  }

  public get password() {
    return this.form.get("password");
  }

  public async join() {
    // Alright, we're ready to start
    this.processing.set(true);

    const formObj: SignUpFormType = this.form.getRawValue() as SignUpFormType;
    return this.authService
      .signUp(formObj)
      .then((payload: IToken) => {
        if (payload.auth_token) {
          this.router.navigateByUrl("/console/summary");
        } else {
          this.toast.error("Unknown error");
        }
      })
      .catch((err) => this.toast.error(err.message))
      .finally(() => this.processing.set(false));
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
