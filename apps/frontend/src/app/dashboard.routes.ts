import type { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  { path: '', redirectTo: 'summary', pathMatch: 'full' },

  {
    path: 'summary',
    loadComponent: () => import('./summary/summary').then((m) => m.Summary),
  },

  {
    path: 'people',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/persons/ui/persons-grid').then((m) => m.PersonsGrid),
        data: { shouldReuse: true, key: 'persongridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/persons/ui/person-detail').then((m) => m.PersonDetail),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/persons/ui/person-detail').then((m) => m.PersonDetail),
      },
    ],
  },

  {
    path: 'households',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/households/ui/households-grid').then((m) => m.HouseholdsGrid),
        data: { shouldReuse: true, key: 'householdsgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/households/ui/household-detail').then((m) => m.HouseholdDetail),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/households/ui/household-detail').then((m) => m.HouseholdDetail),
      },
    ],
  },

  {
    path: 'tags',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/tags/ui/tags-grid').then((m) => m.TagsGridComponent),
        data: { shouldReuse: true, key: 'tagsgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./uxcommon/tags/add-tag').then((m) => m.AddTag),
      },
    ],
  },

  {
    path: 'volunteers',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/persons/ui/persons-grid').then((m) => m.PersonsGrid),
        data: { shouldReuse: true, key: 'volunteersgridroot', tags: ['volunteer'] },
      },
    ],
  },

  {
    path: 'donors',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/persons/ui/persons-grid').then((m) => m.PersonsGrid),
        data: { shouldReuse: true, key: 'donorsgridroot', tags: ['donor'] },
      },
    ],
  },

  {
    path: 'emails',
    loadComponent: () => import('./experiences/emails/ui/email-client/email-client').then((m) => m.EmailClient),
  },
];
