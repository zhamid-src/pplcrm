import { z } from "zod";
import { trpc } from "../../trpc";
import { HouseholdOperator } from "../db.operators/households.operator";

const publicProcedure = trpc.procedure;
const router = trpc.router;
const operator = new HouseholdOperator();

export const householdsRouter = router({
  getOneById: publicProcedure.input(z.number()).query((input) => {
    const id = input;
    return operator.getOneById(id as never);
  }),
  getAll: publicProcedure.query(() => {
    return operator.getAll();
  }),
});

export type HouseholdsRouter = typeof householdsRouter;
