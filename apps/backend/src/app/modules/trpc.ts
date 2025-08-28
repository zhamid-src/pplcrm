/**
 * Entry point that aggregates all application tRPC routers and
 * re-exports individual routers for convenience.
 */
import { router } from '../../trpc';
import { AuthRouter } from './auth/trpc.router';
import { HouseholdsRouter } from './households/trpc.router';
import { PersonsRouter } from './persons/trpc.router';
import { TagsRouter } from './tags/trpc.router';
import { UserProfilesRouter } from './userprofiles/trpc.router';
import { EmailsRouter } from './emails/trpc.router';
import { ListsRouter } from './lists/trpc.router';

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
  lists: ListsRouter,
  emails: EmailsRouter,
});

/**
 * Inferred type representing the full structure of the tRPC API.
 */
export type TRPCRouter = typeof trpcRouter;

// Re-export individual routers for convenience.
export { AuthRouter } from './auth/trpc.router';
export { HouseholdsRouter } from './households/trpc.router';
export { PersonsRouter } from './persons/trpc.router';
export { TagsRouter } from './tags/trpc.router';
export { UserProfilesRouter } from './userprofiles/trpc.router';
export { EmailsRouter } from './emails/trpc.router';
export { ListsRouter } from './lists/trpc.router';
