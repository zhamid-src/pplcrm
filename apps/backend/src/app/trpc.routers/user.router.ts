import { z } from "zod";
import { authProcedure, router } from "../../trpc";
import { UserPofilesOperator } from "../db.operators/users.operator";

const operator = new UserPofilesOperator();

export const usersRouter = router({
  getOneById: authProcedure.input(z.number()).query((input) => {
    const id = input;
    return operator.getOneById(id as never);
  }),
  getAll: authProcedure.query(() => {
    return operator.getAll();
  }),
});

export type UsersRouter = typeof usersRouter;
