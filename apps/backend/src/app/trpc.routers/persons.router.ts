import { UpdatePersonsObj, getAllOptions } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { PersonsHelper } from '../trpc.handler/persons.helper';

const personsHelper = new PersonsHelper();

export const personsRouter = router({
  add: authProcedure.input(UpdatePersonsObj).mutation(({ input }) => personsHelper.add(input)),
  /*
  addMany: authProcedure
    .input(z.array(UpdatePersonsObj))
    .mutation(({ input }) => personsHelper.addMany(input)),
    */
  findOne: authProcedure.input(z.number()).query(({ input }) => personsHelper.findOne(input)),
  findAll: authProcedure.input(getAllOptions).query(({ input }) => personsHelper.findAll(input)),
  getAllWithHouseholds: authProcedure
    .input(getAllOptions)
    .query(({ input }) => personsHelper.getAllWithHouseholds(input)),
  update: authProcedure
    .input(z.object({ id: z.number(), data: UpdatePersonsObj }))
    .mutation(({ input }) => personsHelper.update(input.id, input.data)),
  delete: authProcedure.input(z.number()).mutation(({ input }) => personsHelper.delete(input)),
});

export type PersonsRouter = typeof personsRouter;
