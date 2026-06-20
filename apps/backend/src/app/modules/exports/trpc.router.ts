import { queueExportInput, dataExportRecord } from '../../../../../../libs/common/src';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { ExportsController } from './controller';

const exports_ = new ExportsController();

export const ExportsRouter = router({
  queue: authProcedure
    .input(queueExportInput)
    .output(dataExportRecord)
    .mutation(({ input, ctx }) => exports_.queueExport(input, ctx.auth)),

  list: authProcedure.output(z.array(dataExportRecord)).query(({ ctx }) => exports_.list(ctx.auth)),

  delete: authProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(({ input, ctx }) => exports_.deleteExport(input.id, ctx.auth)),
});
