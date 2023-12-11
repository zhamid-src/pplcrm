import { z } from "zod";
import { trpc } from "../../trpc";
import { PersonsOperator } from "../db.operators/persons.operator";

const operator = new PersonsOperator();
const publicProcedure = trpc.procedure;
const router = trpc.router;

export const personsRouter = router({
  getOneById: publicProcedure.input(z.number()).query((input) => {
    const id = input;
    return operator.getOneById(id as never);
  }),
  getAll: publicProcedure.query(() => {
    return operator.getAll();
  }),
});

export type PersonsRouter = typeof personsRouter;
