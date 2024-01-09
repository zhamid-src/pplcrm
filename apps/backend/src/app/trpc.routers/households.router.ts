import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { HouseholdsHelper } from '../trpc.helper/households.helper';

const households = new HouseholdsHelper();

export const HouseholdsRouter = router({
  findOne: authProcedure.input(z.bigint()).query(({ input }) => households.findOne(input)),
  findAll: authProcedure.query(() => households.findAll()),
  getAllWithPeopleCount: authProcedure.query(() => households.getAllWithPeopleCount()),
});
