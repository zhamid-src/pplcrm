import { Route } from "@angular/router";
import { NotFoundComponent } from "@uxcommon/not-found/not-found.component";
import { AddTagComponent } from "@uxcommon/tags/add/addTag.component";
import { NewPasswordComponent } from "./auth/new-password/new-password.component";
import { ResetPasswordComponent } from "./auth/reset-password/reset-password.component";
import { SignInComponent } from "./auth/signin/signin.component";
import { SignUpComponent } from "./auth/signup/signup.component";
import { HouseholdsComponent } from "./components/households/households.component";
import { PeopleComponent } from "./components/people/people.component";
import { SummaryComponent } from "./components/summary/summary.component";
import { TagsManagerComponent } from "./components/tags-manager/tags-manager.component";
import { authGuard } from "./guards/auth.guard";
import { loginGuard } from "./guards/login.guard";
import { DashboardComponent } from "./layout/dashboard/dashboard.component";

export const appRoutes: Route[] = [
  { path: "", redirectTo: "console/summary", pathMatch: "full" },
  { path: "signin", component: SignInComponent, canActivate: [loginGuard] },
  { path: "signup", component: SignUpComponent },
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
      {
        path: "tags",
        children: [
          {
            path: "",
            component: TagsManagerComponent,
          },
          {
            path: "add",
            component: AddTagComponent,
          },
        ],
      },
    ],
  },
  {
    path: "**",
    component: NotFoundComponent,
  },
];
