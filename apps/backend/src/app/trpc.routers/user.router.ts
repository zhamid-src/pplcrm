import { z } from "zod";
import { trpc } from "../../trpc";
import { UsersOperator } from "../db.operators/users.operator";

const operator = new UsersOperator();
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

I have to do this :-
type Dog = {
  name: string
  neutered: boolean
}

const dogSchema = z.object<Dog>({
  name: z.string().min(3),
  neutered: z.boolean(),
});

*/
export const usersRouter = router({
  getOneById: publicProcedure.input(z.number()).query((input) => {
    const id = input;
    return operator.getOneById(id as never);
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

export type UsersRouter = typeof usersRouter;
