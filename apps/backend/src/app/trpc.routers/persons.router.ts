import { UpdatePersonsObj, getAllOptions } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { PersonsHelper } from '../trpc.helper/persons.helper';

const persons = new PersonsHelper();

export const PersonsRouter = router({
  add: authProcedure.input(UpdatePersonsObj).mutation(({ input }) => persons.add(input)),
  delete: authProcedure.input(z.number()).mutation(({ input }) => persons.delete(input)),
  findOne: authProcedure.input(z.number()).query(({ input }) => persons.findOne(input)),
  findAll: authProcedure.input(getAllOptions).query(({ input }) => persons.findAll(input)),
  getAllWithHouseholds: authProcedure
    .input(getAllOptions)
    .query(({ input }) => persons.getAllWithHouseholds(input)),
  update: authProcedure
    .input(z.object({ id: z.number(), data: UpdatePersonsObj }))
    .mutation(({ input }) => persons.update(input.id, input.data)),
});
