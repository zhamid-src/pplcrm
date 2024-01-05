import { router } from "../trpc";
import { authRouter } from "./trpc.routers/auth.router";
import { householdsRouter } from "./trpc.routers/households.router";
import { personsRouter } from "./trpc.routers/persons.router";
import { tagsRouter } from "./trpc.routers/tags.router";
import { userProfilesRouter } from "./trpc.routers/user.router";

/**
 * Register all trpc routers
 */
export const routers = router({
  auth: authRouter,
  userProfiles: userProfilesRouter,
  households: householdsRouter,
  persons: personsRouter,
  tags: tagsRouter,
});

export type Routers = typeof routers;
