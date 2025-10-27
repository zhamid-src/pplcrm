import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { ImportsController } from './controller';

const imports = new ImportsController();

export const ImportsRouter = router({
  getAll: authProcedure.query(({ ctx }) => imports.list(ctx.auth)),
  delete: authProcedure
    .input(z.object({ id: z.string(), deleteContacts: z.boolean().optional() }))
    .mutation(({ input, ctx }) => imports.deleteImport(input, ctx.auth)),
});
