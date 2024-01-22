import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { HouseholdsController } from '../controllers/households.controller';

const households = new HouseholdsController();

export const HouseholdsRouter = router({
  getById: authProcedure.input(z.string()).query(({ input }) => households.getById(BigInt(input))),
  getAll: authProcedure.query(() => households.getAll()),
  getAllWithPeopleCount: authProcedure.query(() => households.getAllWithPeopleCount()),
  getTags: authProcedure
    .input(z.string())
    .query(({ input, ctx }) => households.getTags(BigInt(input), ctx.auth!)),
  getDistinctTags: authProcedure.query(({ ctx }) => households.getDistinctTags(ctx.auth!)),
});
