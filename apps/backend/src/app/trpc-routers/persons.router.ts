import { UpdatePersonsObj, getAllOptions } from '@common';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { PersonsHouseholdsController } from '../controllers/persons-households.controller';
import { PersonsController } from '../controllers/persons.controller';

const persons = new PersonsController();
const personsHouseholds = new PersonsHouseholdsController();

export const PersonsRouter = router({
  add: authProcedure
    .input(UpdatePersonsObj)
    .mutation(({ input }) => persons.add(input as OperationDataType<'persons', 'insert'>)),
  delete: authProcedure.input(z.string()).mutation(({ input }) => persons.delete(BigInt(input))),
  getById: authProcedure.input(z.string()).query(({ input }) => persons.getById(BigInt(input))),
  getAll: authProcedure.input(getAllOptions).query(({ input }) => persons.getAll(input)),
  getAllWithHouseholds: authProcedure
    .input(getAllOptions)
    .query(({ input }) => personsHouseholds.getAll(input)),
  update: authProcedure
    .input(z.object({ id: z.string(), data: UpdatePersonsObj }))
    .mutation(({ input }) =>
      persons.update(BigInt(input.id), input.data as OperationDataType<'persons', 'update'>),
    ),
});
