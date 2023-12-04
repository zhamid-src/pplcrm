import { z } from 'zod';
import { trpc } from '../../trpc';
import { db } from '../kysely';
import { Int8 } from '../schema/base.schema';
const publicProcedure = trpc.procedure;
const router = trpc.router;

/*
export interface ITodoBody {
  todo: string;
  done: boolean;
}

export interface ITodo extends Partial<ITodoBody> {
  id: number;
}

*/

export const usersRouter = router({
  getById: publicProcedure.input(z.number()).query((input) => {
    const id: Int8 = input as unknown as Int8;
    return db.selectFrom('users').where('id', '=', id).executeTakeFirstOrThrow();
  }),
  getAll: publicProcedure.query(() => {
    return db.selectFrom('users').selectAll().execute();
  }),
  /*
  add: publicProcedure
    .input(
      z.object({
        todo: z.string(),
        done: z.boolean(),
      })
    )
    .mutation((input) => {
      const newTodo: ITodo = {
        id: ++id,
        ...input,
      };
      todos.push(newTodo);
      return newTodo;
    }),
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        todo: z.string().optional(),
        done: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => {
      todos = todos.map((t: ITodo) => (t.id === input.id ? (input as ITodo) : t));
      return input as ITodo;
    }),
  delete: publicProcedure.input(z.number()).mutation(({ input }): ITodo => {
    const todoToDelete: ITodo = todos.find((todo) => todo.id === input) as ITodo;
    todos = todos.filter((todo) => todo.id !== input);
    return todoToDelete;
  }),
  */
});

export type UsersRouter = typeof usersRouter;
