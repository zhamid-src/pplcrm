/**
 * Entry point that aggregates all application tRPC routers and
 * re-exports individual routers for convenience.
 */
import { router } from '../../trpc';
import { AuthRouter } from './auth/trpc.router';
import { EmailsRouter } from './emails/trpc.router';
import { HouseholdsRouter } from './households/trpc.router';
import { ListsRouter } from './lists/trpc.router';
import { NewslettersRouter } from './newsletters/trpc.router';
import { PersonsRouter } from './persons/trpc.router';
import { TagsRouter } from './tags/trpc.router';
import { TasksRouter } from './tasks/trpc.router';
import { UserProfilesRouter } from './userprofiles/trpc.router';
import { TeamsRouter } from './teams/trpc.router';
import { SettingsRouter } from './settings/trpc.router';
import { ImportsRouter } from './imports/trpc.router';
import { MsSyncRouter } from './ms-sync/trpc.router';
import { CompaniesRouter } from './companies/trpc.router';
import { ActivityRouter } from './activity/trpc.router';
import { FilesRouter } from './files/trpc.router';
import { DashboardRouter } from './dashboard/trpc.router';
import { NotificationsRouter } from './notifications/trpc.router';
import { VolunteerRouter } from './volunteer-events/trpc.router';


/**
 * Inferred type representing the full structure of the tRPC API.
 */
export type TRPCRouter = typeof trpcRouter;

/**
 * Registers and groups all tRPC routers for the application.
 *
 * This includes:
 * - `auth`: Authentication-related procedures (sign in, sign up, tokens, etc.)
 * - `userProfiles`: Endpoints for managing user profile data
 * - `households`: CRUD operations and tag mapping for households
 * - `persons`: CRUD operations, tagging, and associations for people
 * - `tags`: Create, update, delete, and search tag records
 */
export const trpcRouter = router({
  auth: AuthRouter,
  authusers: AuthRouter,
  userProfiles: UserProfilesRouter,
  households: HouseholdsRouter,
  persons: PersonsRouter,
  tags: TagsRouter,
  lists: ListsRouter,
  tasks: TasksRouter,
  emails: EmailsRouter,
  newsletters: NewslettersRouter,
  teams: TeamsRouter,
  settings: SettingsRouter,
  imports: ImportsRouter,
  msSync: MsSyncRouter,
  companies: CompaniesRouter,
  activity: ActivityRouter,
  files: FilesRouter,
  dashboard: DashboardRouter,
  notifications: NotificationsRouter,
  volunteer: VolunteerRouter,
});

// Re-export individual routers for convenience.
export { AuthRouter } from './auth/trpc.router';

export { HouseholdsRouter } from './households/trpc.router';

export { PersonsRouter } from './persons/trpc.router';

export { TagsRouter } from './tags/trpc.router';

export { UserProfilesRouter } from './userprofiles/trpc.router';

export { EmailsRouter } from './emails/trpc.router';

export { ListsRouter } from './lists/trpc.router';

export { TasksRouter } from './tasks/trpc.router';

export { NewslettersRouter } from './newsletters/trpc.router';

export { TeamsRouter } from './teams/trpc.router';

export { SettingsRouter } from './settings/trpc.router';

export { ImportsRouter } from './imports/trpc.router';

export { MsSyncRouter } from './ms-sync/trpc.router';

export { CompaniesRouter } from './companies/trpc.router';

export { ActivityRouter } from './activity/trpc.router';

export { FilesRouter } from './files/trpc.router';

export { DashboardRouter } from './dashboard/trpc.router';

export { NotificationsRouter } from './notifications/trpc.router';

export { VolunteerRouter } from './volunteer-events/trpc.router';
