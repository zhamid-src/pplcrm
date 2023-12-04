import { z } from 'zod';
import { trpc } from '../../trpc';
import { PersonsOperator } from '../db.operators/persons.operator';

const operator = new PersonsOperator();
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

export const personsRouter = router({
  getById: publicProcedure.input(z.number()).query((input) => {
    const id: any = input;
    return operator.getById(id);
  }),
  getAll: publicProcedure.query(() => {
    return operator.getAll();
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

export type PersonsRouter = typeof personsRouter;
