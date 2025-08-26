import { UpdatePersonsObj, getAllOptions } from '@common';
import { z } from 'zod';
import { createTaggableRouter } from '../../lib/router.factory';
import { authProcedure } from '../../trpc';
import { PersonsController } from './controller';

const persons = new PersonsController();
(persons as any).add = (input: any, auth: any) => persons.addPerson(input, auth);

export const PersonsRouter = createTaggableRouter(
  persons as any,
  { add: UpdatePersonsObj },
  {
    getAllWithAddress: authProcedure
      .input(getAllOptions)
      .query(({ input, ctx }) => persons.getAllWithAddress(ctx.auth, input)),
    getByHouseholdId: authProcedure
      .input(z.object({ id: z.string(), options: getAllOptions }))
      .query(({ input, ctx }) => persons.getByHouseholdId(input.id, ctx.auth, input.options)),
  },
);
