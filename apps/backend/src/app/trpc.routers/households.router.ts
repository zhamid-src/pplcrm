import { z } from "zod";
import { authProcedure, router } from "../../trpc";
import { HouseholdOperator } from "../db.operators/households.operator";

const operator = new HouseholdOperator();

export const householdsRouter = router({
  getOneById: authProcedure.input(z.number()).query((input) => {
    const id = input;
    return operator.getOneById(id as never);
  }),
  getAll: authProcedure.query(() => {
    return operator.getAll();
  }),
});

export type HouseholdsRouter = typeof householdsRouter;
