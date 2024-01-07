import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { HouseholdOperator } from '../db.operators/households.operator';

const operator = new HouseholdOperator();

export const householdsRouter = router({
  findOne: authProcedure.input(z.number()).query((input) => {
    const id = input as never;
    return operator.findOne(id);
  }),
  findAll: authProcedure.query(() => {
    return operator.findAll();
  }),
  getAllWithPeopleCount: authProcedure.query(() => {
    return operator.getAllWithPeopleCount();
  }),
});

export type HouseholdsRouter = typeof householdsRouter;
