import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { HouseholdsController } from '../controllers/households.controller';

const households = new HouseholdsController();

export const HouseholdsRouter = router({
  findOne: authProcedure.input(z.string()).query(({ input }) => households.findOne(BigInt(input))),
  findAll: authProcedure.query(() => households.findAll()),
  getAllWithPeopleCount: authProcedure.query(() => households.getAllWithPeopleCount()),
});
