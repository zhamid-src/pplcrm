import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { DuplicatesController } from './controller';

const duplicates = new DuplicatesController();

export const DuplicatesRouter = router({
  countQueue: authProcedure.query(({ ctx }) => duplicates.countQueue(ctx.auth)),

  getSweepInfo: authProcedure.query(({ ctx }) => duplicates.getSweepInfo(ctx.auth)),

  dismissGroup: authProcedure
    .input(z.object({ groupKey: z.string().trim().min(1).max(500) }))
    .mutation(({ input, ctx }) => duplicates.dismissGroup(input.groupKey, ctx.auth)),
});
