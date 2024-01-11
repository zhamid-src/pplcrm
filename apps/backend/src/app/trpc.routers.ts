import { router } from '../trpc';
import { AuthRouter } from './trpc-routers/auth.router';
import { HouseholdsRouter } from './trpc-routers/households.router';
import { PersonsRouter } from './trpc-routers/persons.router';
import { TagsRouter } from './trpc-routers/tags.router';
import { UserProfilesRouter } from './trpc-routers/userprofiles.router';

/**
 * Register all trpc routers
 */
export const trpcRouters = router({
  auth: AuthRouter,
  userProfiles: UserProfilesRouter,
  households: HouseholdsRouter,
  persons: PersonsRouter,
  tags: TagsRouter,
});

export type TRPCRouters = typeof trpcRouters;
