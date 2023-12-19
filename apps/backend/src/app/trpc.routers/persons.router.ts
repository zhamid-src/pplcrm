import { getAllOptions } from "@common";
import { z } from "zod";
import { trpc } from "../../trpc";
import { PersonsHelper } from "../trpc.handler/persons.helper";

const publicProcedure = trpc.procedure;
const personsHelper = new PersonsHelper();

const router = trpc.router;

export const personsRouter = router({
  getOneById: publicProcedure
    .input(z.number())
    .query(({ input }) => personsHelper.getOneById(input)),
  getAll: publicProcedure
    .input(getAllOptions)
    .query(({ input }) => personsHelper.getAll(input)),
  getAllWithHouseholds: publicProcedure
    .input(getAllOptions)
    .query(({ input }) => personsHelper.getAllWithHouseholds(input)),
});

export type PersonsRouter = typeof personsRouter;
