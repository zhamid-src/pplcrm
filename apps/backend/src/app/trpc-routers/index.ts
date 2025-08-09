/**
 * Entry point that aggregates all application tRPC routers and
 * re-exports individual routers for convenience.
 */
import { router } from '../../trpc';
import { AuthRouter } from './auth.router';
import { HouseholdsRouter } from './households.router';
import { PersonsRouter } from './persons.router';
import { TagsRouter } from './tags.router';
import { UserProfilesRouter } from './userprofiles.router';
import { EmailsRouter } from './emails.router';

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
  userProfiles: UserProfilesRouter,
  households: HouseholdsRouter,
  persons: PersonsRouter,
  tags: TagsRouter,
  emails: EmailsRouter,
});

/**
 * Inferred type representing the full structure of the tRPC API.
 */
export type TRPCRouter = typeof trpcRouter;

// Re-export individual routers for convenience.
export { AuthRouter } from './auth.router';
export { HouseholdsRouter } from './households.router';
export { PersonsRouter } from './persons.router';
export { TagsRouter } from './tags.router';
export { UserProfilesRouter } from './userprofiles.router';
export { EmailsRouter } from './emails.router';
