import { trpc } from '../trpc';
import { usersRouter } from './routers/user.router';

const router = trpc.router;

export const routers = router({
  users: usersRouter,
});

export type Routers = typeof routers;
