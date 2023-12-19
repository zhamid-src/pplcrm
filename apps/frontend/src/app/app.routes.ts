import { Route } from "@angular/router";
import { authGuard } from "./auth.guard";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { loginGuard } from "./login.guard";
import { LoginComponent } from "./login/login.component";
import { NewPasswordComponent } from "./new-password/new-password.component";
import { PeopleComponent } from "./people/people.component";
import { ResetPasswordComponent } from "./reset-password/reset-password.component";
import { SignupComponent } from "./signup/signup.component";
import { SummaryComponent } from "./summary/summary.component";

export const appRoutes: Route[] = [
  { path: "", redirectTo: "console", pathMatch: "full" },
  { path: "signin", component: LoginComponent, canActivate: [loginGuard] },
  { path: "signup", component: SignupComponent },
  { path: "resetpassword", component: ResetPasswordComponent },
  { path: "newpassword", component: NewPasswordComponent },
  {
    path: "console",
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      {
        path: "summary",
        component: SummaryComponent,
      },
      {
        path: "people",
        component: PeopleComponent,
      },
    ],
  },
];
