import type { Routes } from '@angular/router';
import { roleGuard } from './auth/role-guard';
import { unsavedChangesGuard } from './services/unsaved-changes-guard';

export const dashboardRoutes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'dashboard',
    loadComponent: () => import('./experiences/summary/summary').then((m) => m.Summary),
  },
  // Back-compat: old /summary links (bookmarks, pins, deep links) redirect to /dashboard.
  { path: 'summary', redirectTo: 'dashboard', pathMatch: 'full' },

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
        loadComponent: () => import('./experiences/persons/ui/person-form').then((m) => m.PersonForm),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/persons/ui/person-view').then((m) => m.PersonView),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/persons/ui/person-form').then((m) => m.PersonForm),
        canDeactivate: [unsavedChangesGuard],
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
        loadComponent: () => import('./experiences/households/ui/household-form').then((m) => m.HouseholdForm),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/households/ui/household-view').then((m) => m.HouseholdView),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/households/ui/household-form').then((m) => m.HouseholdForm),
        canDeactivate: [unsavedChangesGuard],
      },
    ],
  },
  {
    path: 'duplicates',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./experiences/duplicates/duplicate-selection').then((m) => m.DuplicateSelectionComponent),
      },
      {
        path: 'people',
        loadComponent: () =>
          import('./experiences/duplicates/duplicates-people').then((m) => m.PeopleDuplicatesComponent),
      },
      {
        path: 'households',
        loadComponent: () =>
          import('./experiences/duplicates/duplicates-households').then((m) => m.HouseholdDuplicatesComponent),
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./experiences/duplicates/duplicates-companies').then((m) => m.CompanyDuplicatesComponent),
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
        loadComponent: () => import('./experiences/tags/ui/add-tag').then((m) => m.AddTag),
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
        loadComponent: () => import('./experiences/lists/ui/list-form').then((m) => m.ListForm),
        data: { mode: 'new' },
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/lists/ui/list-view').then((m) => m.ListView),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/lists/ui/list-form').then((m) => m.ListForm),
        data: { mode: 'edit' },
      },
    ],
  },

  {
    path: 'newsletters',
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
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./experiences/newsletters/ui/newsletter-detail').then((m) => m.NewsletterDetailComponent),
      },
    ],
  },

  {
    path: 'automations',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/workflows/ui/workflows-grid').then((m) => m.WorkflowsGridComponent),
        pathMatch: 'full',
        data: { shouldReuse: true, key: 'workflowsgridroot' },
      },
      {
        path: 'add',
        loadComponent: () => import('./experiences/workflows/ui/workflow-form').then((m) => m.WorkflowFormComponent),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/workflows/ui/workflow-form').then((m) => m.WorkflowFormComponent),
      },
    ],
  },
  // Back-compat: old /workflows links redirect to /automations (prefix keeps :id/add).
  { path: 'workflows', redirectTo: 'automations', pathMatch: 'prefix' },

  {
    path: 'events',
    children: [
      {
        path: '',
        redirectTo: 'pages',
        pathMatch: 'full',
      },
      {
        path: 'shifts',
        children: [
          {
            path: '',
            loadComponent: () => import('./experiences/shifts/ui/shifts-grid').then((m) => m.ShiftsGridComponent),
            data: { shouldReuse: true, key: 'eventsgridroot' },
          },
          {
            path: 'add',
            loadComponent: () => import('./experiences/shifts/ui/shift-form').then((m) => m.ShiftFormComponent),
            canDeactivate: [unsavedChangesGuard],
          },
          {
            path: ':id',
            loadComponent: () => import('./experiences/shifts/ui/shift-view').then((m) => m.ShiftViewComponent),
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./experiences/shifts/ui/shift-form').then((m) => m.ShiftFormComponent),
            canDeactivate: [unsavedChangesGuard],
          },
        ],
      },
      {
        path: 'pages',
        children: [
          {
            path: '',
            loadComponent: () => import('./experiences/events/ui/events-grid').then((m) => m.EventsGridComponent),
            data: { shouldReuse: true, key: 'eventpagesgridroot' },
          },
          {
            path: 'add',
            loadComponent: () => import('./experiences/events/ui/event-form').then((m) => m.EventFormComponent),
            canDeactivate: [unsavedChangesGuard],
          },
          {
            path: ':id',
            loadComponent: () => import('./experiences/events/ui/event-view').then((m) => m.EventViewComponent),
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./experiences/events/ui/event-form').then((m) => m.EventFormComponent),
            canDeactivate: [unsavedChangesGuard],
          },
        ],
      },
    ],
  },

  {
    path: 'donations',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/donations/ui/donations-grid').then((m) => m.DonationsGridComponent),
        data: { shouldReuse: true, key: 'donationsgridroot' },
      },
      {
        path: 'pledges',
        loadComponent: () => import('./experiences/donations/ui/pledges-grid').then((m) => m.PledgesGridComponent),
        data: { shouldReuse: true, key: 'pledgesgridroot' },
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
        loadComponent: () => import('./experiences/teams/ui/team-form').then((m) => m.TeamFormComponent),
        data: { mode: 'new' },
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/teams/ui/team-view').then((m) => m.TeamViewComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/teams/ui/team-form').then((m) => m.TeamFormComponent),
        data: { mode: 'edit' },
        canDeactivate: [unsavedChangesGuard],
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
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/users/ui/user-view').then((m) => m.UserViewComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/users/ui/user-edit').then((m) => m.UserEditComponent),
        canDeactivate: [unsavedChangesGuard],
      },
    ],
  },
  {
    path: 'forms',
    loadComponent: () => import('./experiences/forms/ui/forms-page').then((m) => m.FormsPageComponent),
    data: { shouldReuse: true, key: 'formspageroot' },
  },
  {
    path: 'donation-pages',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./experiences/fundraising/ui/fundraising-grid').then((m) => m.FundraisingGridComponent),
        data: { shouldReuse: true, key: 'donationpagesgridroot' },
      },
      {
        path: 'add',
        loadComponent: () =>
          import('./experiences/fundraising/ui/fundraising-form').then((m) => m.FundraisingFormComponent),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/forms/ui/form-view').then((m) => m.FormViewComponent),
        data: { backRoute: '/donation-pages' },
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./experiences/fundraising/ui/fundraising-form').then((m) => m.FundraisingFormComponent),
      },
    ],
  },

  {
    path: 'settings',
    children: [
      { path: '', redirectTo: 'notifications', pathMatch: 'full' },
      {
        path: ':section',
        loadComponent: () => import('./experiences/settings/settings-page').then((m) => m.SettingsPage),
        data: { mode: 'settings' },
      },
    ],
  },
  {
    path: 'workspace',
    canActivate: [roleGuard],
    children: [
      { path: '', redirectTo: 'organization', pathMatch: 'full' },
      {
        path: ':section',
        loadComponent: () => import('./experiences/settings/settings-page').then((m) => m.SettingsPage),
        data: { mode: 'workspace' },
      },
    ],
  },
  // Back-compat: old /configuration links (bookmarks, help articles pre-rename) redirect to /workspace
  {
    path: 'configuration',
    redirectTo: '/workspace',
    pathMatch: 'prefix',
  },
  {
    path: 'billing',
    redirectTo: '/workspace/billing',
    pathMatch: 'full',
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
    path: 'exports',
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
        loadComponent: () => import('./experiences/companies/ui/company-form').then((m) => m.CompanyForm),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/companies/ui/company-view').then((m) => m.CompanyView),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./experiences/companies/ui/company-form').then((m) => m.CompanyForm),
        canDeactivate: [unsavedChangesGuard],
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
  // Back-compat: old /activities links redirect to /activity.
  { path: 'activities', redirectTo: 'activity', pathMatch: 'full' },
  {
    path: 'help',
    children: [
      {
        path: '',
        loadComponent: () => import('./experiences/help/ui/help-home').then((m) => m.HelpHomePage),
      },
      {
        path: ':id',
        loadComponent: () => import('./experiences/help/ui/help-article').then((m) => m.HelpArticlePage),
      },
    ],
  },
];
