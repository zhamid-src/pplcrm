import { trpc } from '../trpc';
import { todosRouter } from './trpcRouters/todo.router';
import { usersRouter } from './trpcRouters/user.router';

const router = trpc.router;

export const routers = router({
  todo: todosRouter,
  users: usersRouter,
});

export type Routers = typeof routers;
