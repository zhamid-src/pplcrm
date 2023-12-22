import { router } from "../trpc";
import { authRouter } from "./trpc.routers/auth.router";
import { householdsRouter } from "./trpc.routers/households.router";
import { personsRouter } from "./trpc.routers/persons.router";
import { userProfilesRouter } from "./trpc.routers/user.router";

export const routers = router({
  auth: authRouter,
  userProfiles: userProfilesRouter,
  households: householdsRouter,
  persons: personsRouter,
});

export type Routers = typeof routers;
