import { UpdatePersonsObj, getAllOptions } from '@common';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { PersonsController } from '../controllers/persons.controller';

const persons = new PersonsController();

export const PersonsRouter = router({
  add: authProcedure
    .input(UpdatePersonsObj)
    .mutation(({ input }) => persons.add(input as OperationDataType<'persons', 'insert'>)),
  delete: authProcedure.input(z.string()).mutation(({ input }) => persons.delete(BigInt(input))),
  getById: authProcedure.input(z.string()).query(({ input }) => persons.getById(BigInt(input))),
  getByHouseholdId: authProcedure
    .input(z.object({ id: z.string(), options: getAllOptions }))
    .query(({ input, ctx }) =>
      persons.getByHouseholdId(BigInt(input.id), ctx.auth!, input.options),
    ),
  getAll: authProcedure.input(getAllOptions).query(({ input }) => persons.getAll(input)),
  getAllWithAddress: authProcedure
    .input(getAllOptions)
    .query(({ input }) => persons.getAllWithAddress(input)),
  update: authProcedure
    .input(z.object({ id: z.string(), data: UpdatePersonsObj }))
    .mutation(({ input }) =>
      persons.update(BigInt(input.id), input.data as OperationDataType<'persons', 'update'>),
    ),
  getTags: authProcedure
    .input(z.string())
    .query(({ input, ctx }) => persons.getTags(BigInt(input), ctx.auth!)),
  getDistinctTags: authProcedure.query(({ ctx }) => persons.getDistinctTags(ctx.auth!)),
});
