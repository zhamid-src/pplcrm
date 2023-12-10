import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { Component, signal } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import * as common from "@common";
import { PasswordCheckerModule } from "@triangular/password-checker";
import { ToastrService } from "ngx-toastr";
import { AuthService, SignUpFormType } from "../services/auth.service.js";

@Component({
  selector: "pplcrm-signup",
  standalone: true,
  imports: [
    CommonModule,
    PasswordCheckerModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: "./signup.component.html",
  styleUrl: "./signup.component.scss",
})
export class SignupComponent {
  // #region Properties (5)

  protected form = this.fb.group({
    organization: ["", [Validators.required]],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    first_name: ["", [Validators.required]],
    middle_names: [""],
    last_name: [""],
    terms: [""],
  });
  protected joinAttempted = false;
  protected processing = signal(false);
  protected step = 1;
  protected termsAccepted = false;

  // #endregion Properties (5)

  // #region Constructors (1)

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
    private router: Router,
  ) {}

  // #endregion Constructors (1)

  // #region Public Accessors (5)

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

  public get terms() {
    return this.form.get("terms");
  }

  // #endregion Public Accessors (5)

  // #region Public Methods (3)

  public async join() {
    this.joinAttempted = true;
    if (!this.termsAccepted) {
      this.terms?.setErrors({ incorrect: true });
    } else {
      // Alright, we're ready to start
      this.processing.set(true);

      const formObj: SignUpFormType = this.form.getRawValue() as SignUpFormType;
      const payload = await this.authService.signUp(formObj);

      this.processing.set(false);

      if (payload?.error) {
        if (payload?.error === common.AuthErrors.UserAlreadyRegistered) {
          this.toastr.error(
            "This email already exists. Did you mean to sign in?",
          );
        } else {
          this.toastr.error(
            "Unknown error while signing you up. Please try agian later",
          );
        }
      } else {
        this.router.navigateByUrl("/dashboard");
      }
    }
  }

  public next() {
    if (this.step === 1 && !this.organization?.valid) {
      this.markInvalid(this.organization);
    } else if (this.step === 2) {
      if (this.email?.invalid) {
        this.markInvalid(this.email);
      } else if (this.password?.invalid || this.passwordInBreach()) {
        this.markInvalid(this.password);
      }
    } else if (this.step === 3 && !this.firstName?.valid) {
      this.markInvalid(this.firstName);
    } else {
      this.step++;
    }
  }

  public prev() {
    this.step--;
  }

  // #endregion Public Methods (3)

  // #region Protected Methods (2)

  protected passwordBreachNumber() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.password?.errors as any)?.pwnedPasswordOccurrence;
  }

  protected passwordInBreach() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this?.password?.errors as any)?.pwnedPasswordOccurrence;
  }

  // #endregion Protected Methods (2)

  // #region Private Methods (1)

  private markInvalid(
    control: AbstractControl<string | null, string | null> | null,
  ) {
    control?.markAsDirty();
    control?.setErrors({ incorrect: true });
  }

  // #endregion Private Methods (1)
}
