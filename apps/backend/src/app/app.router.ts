import { trpc } from '../trpc';
import { todosRouter } from './routers/todo.router';
import { usersRouter } from './routers/user.router';

const router = trpc.router;

export const routers = router({
  todo: todosRouter,
  users: usersRouter,
});

export type Routers = typeof routers;
