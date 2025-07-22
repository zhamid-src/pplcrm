import { Route } from '@angular/router';
import { NotFound } from '@uxcommon/not-found';
import { AddTag } from 'apps/frontend/src/app/components/tags/add-tag';
import { NewPasswordPage } from './auth/new-password-page';
import { ResetPasswordPage } from './auth/reset-password-page';
import { SignInPage } from './auth/signin-page';
import { SignUpPage } from './auth/signup-page';
import { DonorsGrid } from './components/donors/donors-grid';
import { HouseholdDetail } from './components/households/household-detail';
import { HouseholdsGrid } from './components/households/households-grid';
import { PersonDetail } from './components/persons/person-detail';
import { PersonsGrid } from './components/persons/persons-grid';
import { TagsGridComponent } from './components/tags/tags-grid';
import { VolunteersGrid } from './components/volunteers/volunteers-grid';
import { Summary } from './temp/summary';
import { authGuard } from './auth/auth-guard';
import { loginGuard } from './auth/login-guard';
import { Dashboard } from './layout/dashboard';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'console/summary', pathMatch: 'full' },
  { path: 'signin', component: SignInPage, canActivate: [loginGuard] },
  { path: 'signup', component: SignUpPage },
  { path: 'resetpassword', component: ResetPasswordPage },
  { path: 'newpassword', component: NewPasswordPage },
  {
    path: 'console',
    component: Dashboard,
    canActivate: [authGuard],
    children: [
      {
        path: 'summary',
        component: Summary,
      },
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
  {
    path: '**',
    component: NotFound,
  },
];
