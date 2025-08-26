import { UpdateHouseholdsObj, getAllOptions } from '@common';
import { createTaggableRouter } from '../../lib/router.factory';
import { authProcedure } from '../../trpc';
import { HouseholdsController } from './controller';

const households = new HouseholdsController();
(households as any).add = (input: any, auth: any) => households.addHousehold(input, auth);

export const HouseholdsRouter = createTaggableRouter(
  households as any,
  { add: UpdateHouseholdsObj },
  {
    getAllWithPeopleCount: authProcedure
      .input(getAllOptions)
      .query(({ input, ctx }) => households.getAllWithPeopleCount(ctx.auth, input)),
  },
);
