import { adminOrOwnerProcedure, router } from '../../../trpc';
import { DemoController } from './controller';

const demo = new DemoController();

export const DemoRouter = router({
  /** Deletes all seeded demo data (keeps the starter forms) and clears the tenant's demo flag. */
  exit: adminOrOwnerProcedure.mutation(({ ctx }) => demo.exitDemoMode(ctx.auth)),
});
