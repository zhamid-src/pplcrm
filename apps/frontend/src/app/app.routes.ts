import { Route } from '@angular/router';
import { NotFound } from '@uxcommon/not-found';
import { AddTag } from '@uxcommon/tags/add-tag';

import { authGuard } from './auth/auth-guard';
import { loginGuard } from './auth/login-guard';
import { NewPasswordPage } from './auth/new-password-page';
import { ResetPasswordPage } from './auth/reset-password-page';
import { SignInPage } from './auth/signin-page';
import { SignUpPage } from './auth/signup-page';
import { DonorsGrid } from './features/donors/ui/donors-grid';
import { HouseholdDetail } from './features/households/ui/household-detail';
import { HouseholdsGrid } from './features/households/ui/households-grid';
import { PersonDetail } from './features/persons/ui/person-detail';
import { PersonsGrid } from './features/persons/ui/persons-grid';
import { TagsGridComponent } from './features/tags/ui/tags-grid';
import { VolunteersGrid } from './features/volunteers/ui/volunteers-grid';
import { Dashboard } from './layout/dashboards/dashboard';
import { Summary } from './temp/summary';

/**
 * The main route configuration for the application.
 *
 * Includes routing for authentication, dashboard, and fallback routes.
 */
export const appRoutes: Route[] = [
  /**
   * Default redirect to summary page inside the dashboard.
   */
  { path: '', redirectTo: 'console/summary', pathMatch: 'full' },

  /**
   * Auth pages (sign-in, sign-up, reset password).
   */
  { path: 'signin', component: SignInPage, canActivate: [loginGuard] },
  { path: 'signup', component: SignUpPage },
  { path: 'resetpassword', component: ResetPasswordPage },
  { path: 'newpassword', component: NewPasswordPage },

  /**
   * Main dashboard protected by authGuard.
   */
  {
    path: 'console',
    component: Dashboard,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'summary',
        pathMatch: 'full',
      },
      /**
       * Dashboard summary page.
       */
      {
        path: 'summary',
        component: Summary,
      },

      /**
       * People management routes.
       */
      {
        path: 'people',
        children: [
          {
            path: '',
            component: PersonsGrid,
            data: { shouldReuse: true, key: 'persongridroot' },
          },
          {
            path: 'add',
            component: PersonDetail,
          },
          {
            path: ':id',
            component: PersonDetail,
          },
        ],
      },

      /**
       * Household management routes.
       */
      {
        path: 'households',
        children: [
          {
            path: '',
            component: HouseholdsGrid,
            data: { shouldReuse: true, key: 'householdsgridroot' },
          },
          {
            path: 'add',
            component: HouseholdDetail,
          },
          {
            path: ':id',
            component: HouseholdDetail,
          },
        ],
      },

      /**
       * Tag management routes.
       */
      {
        path: 'tags',
        children: [
          {
            path: '',
            component: TagsGridComponent,
            data: { shouldReuse: true, key: 'tagsgridroot' },
          },
          {
            path: 'add',
            component: AddTag,
          },
        ],
      },

      /**
       * Volunteer management route.
       */
      {
        path: 'volunteers',
        children: [
          {
            path: '',
            component: VolunteersGrid,
            data: { shouldReuse: true, key: 'volunteersgridroot' },
          },
        ],
      },

      /**
       * Donor management route.
       */
      {
        path: 'donors',
        children: [
          {
            path: '',
            component: DonorsGrid,
            data: { shouldReuse: true, key: 'donorsgridroot' },
          },
        ],
      },
    ],
  },

  /**
   * Fallback route for undefined paths.
   */
  {
    path: '**',
    component: NotFound,
  },
];
