import { Route } from "@angular/router";
import { NotFoundComponent } from "@uxcommon/not-found/not-found.component";
import { LoginComponent } from "./auth/login/login.component";
import { NewPasswordComponent } from "./auth/new-password/new-password.component";
import { ResetPasswordComponent } from "./auth/reset-password/reset-password.component";
import { SignupComponent } from "./auth/signup/signup.component";
import { HouseholdsComponent } from "./components/households/households.component";
import { PeopleComponent } from "./components/people/people.component";
import { SummaryComponent } from "./components/summary/summary.component";
import { authGuard } from "./guards/auth.guard";
import { loginGuard } from "./guards/login.guard";
import { DashboardComponent } from "./layout/dashboard/dashboard.component";

export const appRoutes: Route[] = [
  { path: "", redirectTo: "console/summary", pathMatch: "full" },
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
      {
        path: "households",
        component: HouseholdsComponent,
      },
    ],
  },
  {
    path: "**",
    component: NotFoundComponent,
  },
];
