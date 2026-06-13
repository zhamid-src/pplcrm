import type { Routes } from '@angular/router';
import { roleGuard } from './auth/role-guard';

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
        path: 'duplicates',
        loadComponent: () => import('./experiences/persons/ui/duplicate-manager').then((m) => m.DuplicateManager),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/persons/ui/person-view').then((m) => m.PersonView),
      },
      {
        path: ':id/edit',
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
        loadComponent: () => import('./experiences/households/ui/household-view').then((m) => m.HouseholdView),
      },
      {
        path: ':id/edit',
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
        loadComponent: () => import('@uxcommon/components/tags/add-tag').then((m) => m.AddTag),
      },
    ],
  },

  {
    path: 'issues',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/tags/ui/issues-grid').then((m) => m.IssuesGridComponent),
        data: { shouldReuse: true, key: 'issuesgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/tags/ui/add-issue').then((m) => m.AddIssue),
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
    path: 'workflows',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/workflows/ui/workflows-grid').then((m) => m.WorkflowsGridComponent),
        pathMatch: 'full',
        data: { shouldReuse: true, key: 'workflowsgridroot' },
      },
      {
        path: 'add',
        loadComponent: () =>
          import('./experiences/workflows/ui/workflow-detail').then((m) => m.WorkflowDetailComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./experiences/workflows/ui/workflow-detail').then((m) => m.WorkflowDetailComponent),
      },
    ],
  },

  {
    path: 'events',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/volunteer/ui/events-grid').then((m) => m.EventsGridComponent),
        data: { shouldReuse: true, key: 'eventsgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/volunteer/ui/event-detail').then((m) => m.EventDetailComponent),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/volunteer/ui/event-view').then((m) => m.EventViewComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/volunteer/ui/event-detail').then((m) => m.EventDetailComponent),
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
    path: 'inbox',
    loadComponent: () => import('./experiences/emails/ui/email-client/email-client').then((m) => m.EmailClient),
  },
  {
    path: 'tasks',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/tasks/ui/tasks-grid').then((m) => m.TasksGrid),
        data: { shouldReuse: true, key: 'tasksgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/tasks/ui/task-add').then((m) => m.TaskAddComponent),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/tasks/ui/task-view').then((m) => m.TaskView),
      },
    ],
  },
  {
    path: 'board',
    loadComponent: () => import('./experiences/tasks/ui/tasks-board').then((m) => m.TasksBoard),
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
        loadComponent: () => import('./experiences/teams/ui/team-view').then((m) => m.TeamViewComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/teams/ui/team-detail').then((m) => m.TeamDetailComponent),
        data: { mode: 'edit' },
      },
    ],
  },
  {
    path: 'users',
    canActivate: [roleGuard],
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
        loadComponent: () => import('./experiences/users/ui/user-view').then((m) => m.UserViewComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/users/ui/user-detail').then((m) => m.UserDetailComponent),
      },
    ],
  },
  {
    path: 'forms',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/forms/ui/forms-grid').then((m) => m.FormsGridComponent),
        data: { shouldReuse: true, key: 'formsgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/forms/ui/form-detail').then((m) => m.FormDetailComponent),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/forms/ui/form-view').then((m) => m.FormViewComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/forms/ui/form-detail').then((m) => m.FormDetailComponent),
      },
    ],
  },
  {
    path: 'settings',
    loadComponent: () => import('./experiences/settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'configuration',
    canActivate: [roleGuard],
    loadComponent: () => import('./experiences/settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'billing',
    canActivate: [roleGuard],
    loadComponent: () => import('./experiences/settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'profile',
    loadComponent: () => import('./experiences/profile/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: 'imports',
    loadComponent: () => import('./experiences/imports/ui/imports-page').then((m) => m.ImportsPage),
  },
  {
    path: 'export',
    loadComponent: () => import('./experiences/exports/ui/exports-page').then((m) => m.ExportsPage),
  },
  {
    path: 'companies',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/companies/ui/companies-grid').then((m) => m.CompaniesGrid),
        data: { shouldReuse: true, key: 'companiesgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/companies/ui/company-detail').then((m) => m.CompanyDetail),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/companies/ui/company-view').then((m) => m.CompanyView),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/companies/ui/company-detail').then((m) => m.CompanyDetail),
      },
    ],
  },
  {
    path: 'files',
    loadComponent: () => import('./experiences/files/ui/files-grid').then((m) => m.FilesGrid),
  },
  {
    path: 'activity',
    loadComponent: () => import('./experiences/activity/ui/activity-feed').then((m) => m.ActivityFeed),
  },
];
