import type { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  { path: '', redirectTo: 'summary', pathMatch: 'full' },

  {
    path: 'summary',
    loadComponent: () => import('./experiences/summary/summary').then((m) => m.Summary),
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
        loadComponent: () => import('./uxcommon/components/tags/add-tag').then((m) => m.AddTag),
      },
    ],
  },

  {
    path: 'lists',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/lists/ui/lists-grid').then((m) => m.ListsGridComponent),
        data: { shouldReuse: true, key: 'listsgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/lists/ui/list-detail').then((m) => m.ListDetail),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/lists/ui/list-view').then((m) => m.ListView),
      },
    ],
  },

  {
    path: 'newsletter',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./experiences/newsletters/ui/newsletters-grid').then((m) => m.NewslettersGridComponent),
        pathMatch: 'full',
        data: { shouldReuse: true, key: 'newslettersgridroot' },
      },
      {
        path: 'add',
        loadComponent: () =>
          import('./experiences/newsletters/ui/newsletter-add').then((m) => m.NewsletterAddComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./experiences/newsletters/ui/newsletter-detail').then((m) => m.NewsletterDetailComponent),
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
    path: 'inbox',
    loadComponent: () => import('./experiences/emails/ui/email-client/email-client').then((m) => m.EmailClient),
  },
  {
    path: 'tasks',
    loadComponent: () => import('./experiences/tasks/ui/tasks-grid').then((m) => m.TasksGrid),
  },
  {
    path: 'board',
    loadComponent: () => import('./experiences/tasks/ui/tasks-board').then((m) => m.TasksBoard),
  },
  {
    path: 'tasks/:id',
    loadComponent: () => import('./experiences/tasks/ui/task-detail').then((m) => m.TaskDetail),
  },
  {
    path: 'teams',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/teams/ui/teams-grid').then((m) => m.TeamsGridComponent),
        data: { shouldReuse: true, key: 'teamsgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/teams/ui/team-detail').then((m) => m.TeamDetailComponent),
        data: { mode: 'new' },
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/teams/ui/team-detail').then((m) => m.TeamDetailComponent),
        data: { mode: 'edit' },
      },
    ],
  },
  {
    path: 'users',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/users/ui/users-grid').then((m) => m.UsersGridComponent),
        data: { shouldReuse: true, key: 'usersgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/users/ui/user-add').then((m) => m.UserAddComponent),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/users/ui/user-detail').then((m) => m.UserDetailComponent),
      },
    ],
  },
  {
    path: 'settings',
    loadComponent: () => import('./experiences/settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'billing',
    loadComponent: () => import('./experiences/billing/billing-page').then((m) => m.BillingPage),
  },
  {
    path: 'export',
    loadComponent: () => import('./experiences/exports/ui/exports-page').then((m) => m.ExportsPage),
  },
];
