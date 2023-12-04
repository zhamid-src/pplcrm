import { trpc } from '../trpc';
import { householdsRouter } from './trpc.routers/households.router';
import { personsRouter } from './trpc.routers/persons.router';
import { usersRouter } from './trpc.routers/user.router';

const router = trpc.router;

export const routers = router({
  users: usersRouter,
  households: householdsRouter,
  persons: personsRouter,
});

export type Routers = typeof routers;
