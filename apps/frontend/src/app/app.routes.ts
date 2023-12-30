import { Route } from "@angular/router";
import { NotFoundComponent } from "@uxcommon/not-found/not-found.component";
import { AddTagComponent } from "@uxcommon/tags/add/addTag.component";
import { NewPasswordComponent } from "./auth/new-password/new-password.component";
import { ResetPasswordComponent } from "./auth/reset-password/reset-password.component";
import { SignInComponent } from "./auth/signin/signin.component";
import { SignUpComponent } from "./auth/signup/signup.component";
import { HouseholdsGridComponent } from "./components/grids/households/households-grid.component";
import { PersonsGridComponent } from "./components/grids/persons/persons-grid.component";
import { TagsGridComponent } from "./components/grids/tags/tags-grid.component";
import { SummaryComponent } from "./components/summary/summary.component";
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
        component: PersonsGridComponent,
      },
      {
        path: "households",
        component: HouseholdsGridComponent,
      },
      {
        path: "tags",
        children: [
          {
            path: "",
            component: TagsGridComponent,
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
