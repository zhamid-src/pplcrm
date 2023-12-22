import { z } from "zod";
import { authProcedure, router } from "../../trpc";
import { UserPofilesOperator } from "../db.operators/user-profiles.operator";

const operator = new UserPofilesOperator();

export const userProfilesRouter = router({
  getOneById: authProcedure.input(z.number()).query((input) => {
    const id = input;
    return operator.getOneById(id as never);
  }),
  getAll: authProcedure.query(() => {
    return operator.getAll();
  }),
});

export type UserProfilesRouter = typeof userProfilesRouter;
