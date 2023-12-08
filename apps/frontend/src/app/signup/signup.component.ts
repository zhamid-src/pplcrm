import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { Component } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { PasswordCheckerModule } from "@triangular/password-checker";
import { ToastrService } from "ngx-toastr";
import { AuthService } from "../services/auth.service.js";

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
  // #region Properties (4)

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
  protected step = 1;
  protected termsAccepted = false;

  // #endregion Properties (4)

  // #region Constructors (1)

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
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

  public join() {
    this.joinAttempted = true;
    if (!this.termsAccepted) {
      this.terms?.setErrors({ incorrect: true });
    }
  }

  public next() {
    if (this.step === 1 && !this.organization?.valid) {
      this.markInvalid(this.organization);
    } else if (
      this.step === 2 &&
      (this.email?.invalid || this.password?.invalid || this.passwordInBreach())
    ) {
      // continue
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
