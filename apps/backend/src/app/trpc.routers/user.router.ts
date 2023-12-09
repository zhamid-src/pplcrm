import { z } from "zod";
import { trpc } from "../../trpc";
import { UsersOperator } from "../db.operators/users.operator";

const operator = new UsersOperator();
const publicProcedure = trpc.procedure;
const router = trpc.router;

export const usersRouter = router({
  getOneById: publicProcedure.input(z.number()).query((input) => {
    const id = input;
    return operator.getOneById(id as never);
  }),
  getAll: publicProcedure.query(() => {
    return operator.getAll();
  }),
});

export type UsersRouter = typeof usersRouter;
