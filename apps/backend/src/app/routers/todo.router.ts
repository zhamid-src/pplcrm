import { z } from 'zod';
import { trpc } from '../../trpc';
import { ITodo } from '../models/todo.model';

const publicProcedure = trpc.procedure;
const router = trpc.router;

let id = 1;

// pretend dB
let todos: ITodo[] = [
  {
    id: 0,
    todo: 'Clean the kitchen',
    done: false,
  },
  {
    id: 1,
    todo: 'Bring out the trash',
    done: false,
  },
];

export const todosRouter = router({
  getAll: publicProcedure.query(() => todos),
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
      todos = todos.map((t: ITodo) =>
        t.id === input.id ? (input as ITodo) : t
      );
      return input as ITodo;
    }),
  delete: publicProcedure.input(z.number()).mutation(({ input }): ITodo => {
    const todoToDelete: ITodo = todos.find(
      (todo) => todo.id === input
    ) as ITodo;
    todos = todos.filter((todo) => todo.id !== input);
    return todoToDelete;
  }),
});

export type TodosRouter = typeof todosRouter;
