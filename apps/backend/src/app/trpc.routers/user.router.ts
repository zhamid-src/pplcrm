import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { UserPofilesOperator } from '../db.operators/user-profiles.operator';

const operator = new UserPofilesOperator();

export const userProfilesRouter = router({
  findOne: authProcedure.input(z.number()).query((input) => {
    const id = input;
    return operator.findOne(id as never);
  }),
  findAll: authProcedure.query(() => {
    return operator.findAll();
  }),
});

export type UserProfilesRouter = typeof userProfilesRouter;
