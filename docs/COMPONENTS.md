# 🧭 PeopleCRM Frontend Feature Components Documentation

This document catalogs the domain-specific experience components located under `apps/frontend/src/app/experiences`. These components represent the views, grids, and dashboards corresponding to each domain in PeopleCRM.

---

## 🗂️ Domain Layouts & Directories

The frontend follows a feature-by-experience design where each folder in `experiences/` handles the routing, UI templates, and business logic adapters for that particular workspace domain.

---

## 📊 Feature Component Catalog

### 1. Dashboard / Summary
* **Component**: `SummaryComponent`
* **Path**: [`experiences/summary/summary.ts`](../apps/frontend/src/app/experiences/summary/summary.ts)
* **Description**: The home dashboard of the CRM. It presents aggregate metrics (total people, households, lists, task statuses) and activity overview stats using clean count widgets.

### 2. Persons (Contacts)
Manages individual contact details, histories, and demographic information.
* **`PersonsGridComponent`**
  * **Path**: [`experiences/persons/ui/persons-grid.ts`](../apps/frontend/src/app/experiences/persons/ui/persons-grid.ts)
  * **Description**: Displays all system contacts. Integrates the `pc-datagrid` with custom cell definitions for names, emails, phones, and interactive tag lists.
* **`PersonDetailComponent`**
  * **Path**: [`experiences/persons/ui/person-detail.ts`](../apps/frontend/src/app/experiences/persons/ui/person-detail.ts)
  * **Description**: Edit form page for contacts. Hosts sections for editing general profile details, tags, households, tasks history, and notes.
* **`PeopleInHouseholdComponent`**
  * **Path**: [`experiences/persons/ui/people-in-household.ts`](../apps/frontend/src/app/experiences/persons/ui/people-in-household.ts)
  * **Description**: A sub-list view displaying all people sharing a specific household ID.

### 3. Households
Groups contacts together geographically or structurally.
* **`HouseholdsGridComponent`**
  * **Path**: [`experiences/households/ui/households-grid.ts`](../apps/frontend/src/app/experiences/households/ui/households-grid.ts)
  * **Description**: List view of households with address and member totals, utilizing the shared `pc-datagrid`.
* **`HouseholdDetailComponent`**
  * **Path**: [`experiences/households/ui/household-detail.ts`](../apps/frontend/src/app/experiences/households/ui/household-detail.ts)
  * **Description**: Detailed edit/view workspace showing household address, metadata, and an inline roster of members.

### 4. Emails
A comprehensive team email inbox and communication client.
* **`EmailClientComponent`**
  * **Path**: [`experiences/emails/ui/email-client/email-client.ts`](../apps/frontend/src/app/experiences/emails/ui/email-client/email-client.ts)
  * **Description**: Layout shell that joins folder lists, message listings, and detail panes into a unified mail desktop app experience.
* **`EmailFolderListComponent`**
  * **Path**: [`experiences/emails/ui/email-folder-list/email-folder-list.ts`](../apps/frontend/src/app/experiences/emails/ui/email-folder-list/email-folder-list.ts)
  * **Description**: Sidebar navigations for standard mail folders (Inbox, Sent, Drafts, Archive, Spam).
* **`EmailListComponent`**
  * **Path**: [`experiences/emails/ui/email-list/email-list.ts`](../apps/frontend/src/app/experiences/emails/ui/email-list/email-list.ts)
  * **Description**: List panel showing incoming emails, their assignment status, tags, and read/unread status.
* **`EmailDetailsComponent`**
  * **Path**: [`experiences/emails/ui/email-details/email-details.ts`](../apps/frontend/src/app/experiences/emails/ui/email-details/email-details.ts)
  * **Description**: Reading pane showing headers, content, associated attachments, and team activities.
* **`EmailComposeComponent`**
  * **Path**: [`experiences/emails/ui/email-compose/email-compose.ts`](../apps/frontend/src/app/experiences/emails/ui/email-compose/email-compose.ts)
  * **Description**: HTML text editor component to write and send messages. Hooks in the `MentionController` for tagging other users.
* **`EmailCommentsComponent`**
  * **Path**: [`experiences/emails/ui/email-comments/email-comments.ts`](../apps/frontend/src/app/experiences/emails/ui/email-comments/email-comments.ts)
  * **Description**: Side comments panel where team members can post internal notes about a particular thread.

### 5. Lists & Segmenting
Used to manage custom marketing lists and targeted groups.
* **`ListsGridComponent`**
  * **Path**: [`experiences/lists/ui/lists-grid.ts`](../apps/frontend/src/app/experiences/lists/ui/lists-grid.ts)
  * **Description**: Displays lists metadata, member counts, and quick-action buttons.
* **`ListDetailComponent`**
  * **Path**: [`experiences/lists/ui/list-detail.ts`](../apps/frontend/src/app/experiences/lists/ui/list-detail.ts)
  * **Description**: The panel to modify list names, view subscribed contacts, and configure rules.
* **`TagRuleBuilderComponent`**
  * **Path**: [`experiences/lists/ui/tag-rule-builder.ts`](../apps/frontend/src/app/experiences/lists/ui/tag-rule-builder.ts)
  * **Description**: A builder panel that lets users write boolean logical formulas of tags (e.g. `has Tag A AND does NOT have Tag B`) to dynamically filter active subscribers.

### 6. Tasks
Handles internal workflow task assignments and deadlines.
* **`TasksBoardComponent`**
  * **Path**: [`experiences/tasks/ui/tasks-board.ts`](../apps/frontend/src/app/experiences/tasks/ui/tasks-board.ts)
  * **Description**: A drag-and-drop Kanban Board displaying cards in status columns (e.g. To Do, In Progress, Blocked, Done).
* **`TasksGridComponent`**
  * **Path**: [`experiences/tasks/ui/tasks-grid.ts`](../apps/frontend/src/app/experiences/tasks/ui/tasks-grid.ts)
  * **Description**: Tabular alternative view of tasks for quick multi-sorting and batch status changes.
* **`TaskDetailComponent`**
  * **Path**: [`experiences/tasks/ui/task-detail.ts`](../apps/frontend/src/app/experiences/tasks/ui/task-detail.ts)
  * **Description**: View and update deadlines, task descriptions, assignee associations, and completion checklists.

### 7. Newsletters
Campaign templates and distribution.
* **`NewslettersGridComponent`**
  * **Path**: [`experiences/newsletters/ui/newsletters-grid.ts`](../apps/frontend/src/app/experiences/newsletters/ui/newsletters-grid.ts)
  * **Description**: Displays newsletter drafts and sent histories.
* **`NewsletterDetailComponent`**
  * **Path**: [`experiences/newsletters/ui/newsletter-detail.ts`](../apps/frontend/src/app/experiences/newsletters/ui/newsletter-detail.ts)
  * **Description**: Layout editor to review subject, body content, and send test emails.

### 8. Teams
Manages organization rosters and member roles.
* **`TeamsGridComponent`**
  * **Path**: [`experiences/teams/ui/teams-grid.ts`](../apps/frontend/src/app/experiences/teams/ui/teams-grid.ts)
  * **Description**: Lists existing organizational teams, member sizes, and owners.
* **`TeamDetailComponent`**
  * **Path**: [`experiences/teams/ui/team-detail.ts`](../apps/frontend/src/app/experiences/teams/ui/team-detail.ts)
  * **Description**: Roster configuration. Assign or remove users from teams, update roles, and manage permissions.

### 9. Tags Manager
* **`TagsGridComponent`**
  * **Path**: [`experiences/tags/ui/tags-grid.ts`](../apps/frontend/src/app/experiences/tags/ui/tags-grid.ts)
  * **Description**: An administrative grid interface allowing users to create new system tags, change colors, delete existing unused tags, and monitor overall tag usage statistics.

### 10. Users
* **`UsersGridComponent`**
  * **Path**: [`experiences/users/ui/users-grid.ts`](../apps/frontend/src/app/experiences/users/ui/users-grid.ts)
  * **Description**: User management table for administrators. Controls account status (active/deactivated).
* **`UserDetailComponent`**
  * **Path**: [`experiences/users/ui/user-detail.ts`](../apps/frontend/src/app/experiences/users/ui/user-detail.ts)
  * **Description**: Profile settings, editing email preferences, role changes, and credentials resetting.

### 11. Imports & Exports
* **`ImportsPageComponent`**
  * **Path**: [`experiences/imports/ui/imports-page.ts`](../apps/frontend/src/app/experiences/imports/ui/imports-page.ts)
  * **Description**: File upload dashboard that allows users to parse and import large contact records from CSVs.
* **`ExportsPageComponent`**
  * **Path**: [`experiences/exports/ui/exports-page.ts`](../apps/frontend/src/app/experiences/exports/ui/exports-page.ts)
  * **Description**: Filtering page that compiles target cohorts and prepares downloadable CSV assets.

### 12. Settings Page
* **`SettingsPageComponent`**
  * **Path**: [`experiences/settings/settings-page.ts`](../apps/frontend/src/app/experiences/settings/settings-page.ts)
  * **Description**: Core system management form. Provides inputs for configuring SMTP connection settings, outgoing server details, and general platform customization properties.
