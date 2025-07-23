import { router } from '../trpc';
import { AuthRouter } from './trpc-routers/auth.router';
import { HouseholdsRouter } from './trpc-routers/households.router';
import { PersonsRouter } from './trpc-routers/persons.router';
import { TagsRouter } from './trpc-routers/tags.router';
import { UserProfilesRouter } from './trpc-routers/userprofiles.router';

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
export const trpcRouters = router({
  auth: AuthRouter,
  userProfiles: UserProfilesRouter,
  households: HouseholdsRouter,
  persons: PersonsRouter,
  tags: TagsRouter,
});

/**
 * Inferred type representing the full structure of the tRPC API.
 */
export type TRPCRouters = typeof trpcRouters;
