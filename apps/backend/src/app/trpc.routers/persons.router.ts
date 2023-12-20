import { getAllOptions } from "@common";
import { z } from "zod";
import { authProcedure, router } from "../../trpc";
import { PersonsHelper } from "../trpc.handler/persons.helper";

const personsHelper = new PersonsHelper();

export const personsRouter = router({
  getOneById: authProcedure
    .input(z.number())
    .query(({ input }) => personsHelper.getOneById(input)),
  getAll: authProcedure
    .input(getAllOptions)
    .query(({ input }) => personsHelper.getAll(input)),
  getAllWithHouseholds: authProcedure
    .input(getAllOptions)
    .query(({ input }) => personsHelper.getAllWithHouseholds(input)),
});

export type PersonsRouter = typeof personsRouter;
