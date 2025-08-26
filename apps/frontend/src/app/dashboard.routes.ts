import type { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    redirectTo: 'summary',
    pathMatch: 'full',
  },
  {
    path: 'summary',
    component: () => import('./summary/summary').then((m) => m.Summary),
  },
  {
    path: 'people',
    children: [
      {
        path: '',
        component: () =>
          import('./experiences/persons/ui/persons-grid').then((m) => m.PersonsGrid),
        data: { shouldReuse: true, key: 'persongridroot' },
      },
      {
        path: 'add',
        component: () =>
          import('./experiences/persons/ui/person-detail').then(
            (m) => m.PersonDetail
          ),
      },
      {
        path: ':id',
        component: () =>
          import('./experiences/persons/ui/person-detail').then(
            (m) => m.PersonDetail
          ),
      },
    ],
  },
  {
    path: 'households',
    children: [
      {
        path: '',
        component: () =>
          import('./experiences/households/ui/households-grid').then(
            (m) => m.HouseholdsGrid
          ),
        data: { shouldReuse: true, key: 'householdsgridroot' },
      },
      {
        path: 'add',
        component: () =>
          import('./experiences/households/ui/household-detail').then(
            (m) => m.HouseholdDetail
          ),
      },
      {
        path: ':id',
        component: () =>
          import('./experiences/households/ui/household-detail').then(
            (m) => m.HouseholdDetail
          ),
      },
    ],
  },
  {
    path: 'tags',
    children: [
      {
        path: '',
        component: () =>
          import('./experiences/tags/ui/tags-grid').then(
            (m) => m.TagsGridComponent
          ),
        data: { shouldReuse: true, key: 'tagsgridroot' },
      },
      {
        path: 'add',
        component: () =>
          import('./uxcommon/tags/add-tag').then((m) => m.AddTag),
      },
    ],
  },
  {
    path: 'volunteers',
    children: [
      {
        path: '',
        component: () =>
          import('./experiences/persons/ui/persons-grid').then((m) => m.PersonsGrid),
        data: { shouldReuse: true, key: 'volunteersgridroot', tags: ['volunteer'] },
      },
    ],
  },
  {
    path: 'donors',
    children: [
      {
        path: '',
        component: () =>
          import('./experiences/persons/ui/persons-grid').then((m) => m.PersonsGrid),
        data: { shouldReuse: true, key: 'donorsgridroot', tags: ['donor'] },
      },
    ],
  },
  {
    path: 'emails',
    component: () =>
      import('./experiences/emails/ui/email-client/email-client').then(
        (m) => m.EmailClient
      ),
  },
];
