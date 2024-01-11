import { UpdatePersonsObj, getAllOptions } from '@common';
import { Models } from 'common/src/lib/kysely.models';
import { InsertObjectOrList } from 'node_modules/kysely/dist/cjs/parser/insert-values-parser';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { PersonsHouseholdsController } from '../controllers/persons-households.controller';
import { PersonsController } from '../controllers/persons.controller';

const persons = new PersonsController();
const personsHouseholds = new PersonsHouseholdsController();

export const PersonsRouter = router({
  add: authProcedure
    .input(UpdatePersonsObj)
    .mutation(({ input }) => persons.addOne(input as InsertObjectOrList<Models, 'persons'>)),
  delete: authProcedure.input(z.bigint()).mutation(({ input }) => persons.delete(input)),
  findOne: authProcedure.input(z.bigint()).query(({ input }) => persons.findOne(input)),
  findAll: authProcedure.input(getAllOptions).query(({ input }) => persons.findAll(input)),
  getAllWithHouseholds: authProcedure
    .input(getAllOptions)
    .query(({ input }) => personsHouseholds.findAll(input)),
  update: authProcedure
    .input(z.object({ id: z.bigint(), data: UpdatePersonsObj }))
    .mutation(({ input }) => persons.update(input.id, input.data)),
});
