import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { Component } from "@angular/core";
import { PasswordCheckerModule } from "@triangular/password-checker";

@Component({
  selector: "pplcrm-signup",
  standalone: true,
  imports: [CommonModule, PasswordCheckerModule, HttpClientModule],
  templateUrl: "./signup.component.html",
  styleUrl: "./signup.component.scss",
})
export class SignupComponent {
  protected step = 1;

  next() {
    this.step++;
  }

  prev() {
    this.step--;
  }

  submit() {}
}
