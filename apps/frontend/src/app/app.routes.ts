import { Route } from '@angular/router';
import { EmailClient } from '@experiences/emails/ui/email-client/email-client';
import { HouseholdDetail } from '@experiences/households/ui/household-detail';
import { HouseholdsGrid } from '@experiences/households/ui/households-grid';
import { PersonDetail } from '@experiences/persons/ui/person-detail';
import { PersonsGrid } from '@experiences/persons/ui/persons-grid';
import { TagsGridComponent } from '@experiences/tags/ui/tags-grid';
import { NotFound } from '@uxcommon/not-found/not-found';
import { AddTag } from '@uxcommon/tags/add-tag';

import { authGuard } from './auth/auth-guard';
import { loginGuard } from './auth/login/login-guard';
import { NewPasswordPage } from './auth/new-password-page/new-password-page';
import { ResetPasswordPage } from './auth/reset-password-page/reset-password-page';
import { SignInPage } from './auth/signin-page/signin-page';
import { SignUpPage } from './auth/signup-page/signup-page';
import { Dashboard } from './layout/dashboards/dashboard';
import { Summary } from './summary/summary';

/**
 * The main route configuration for the application.
 *
 * Includes routing for authentication, dashboard, and fallback routes.
 */
export const appRoutes: Route[] = [
  /**
   * Default redirect to summary page inside the dashboard.
   */
  { path: '', redirectTo: 'summary', pathMatch: 'full' },

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
    path: '',
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
            component: PersonsGrid,
            data: { shouldReuse: true, key: 'volunteersgridroot', tags: ['volunteer'] },
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
            component: PersonsGrid,
            data: { shouldReuse: true, key: 'donorsgridroot', tags: ['donor'] },
          },
        ],
      },

      {
        path: 'emails',
        component: EmailClient,
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
