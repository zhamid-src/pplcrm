import { idSchema, CompanyInputObj } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { CompaniesController } from './controller';
import { createCrudRouter } from '../../lib/crud-router';

const companies = new CompaniesController();

const CompanyInputSchema = CompanyInputObj;

const crud = createCrudRouter(companies, CompanyInputSchema, CompanyInputSchema.partial());

export const CompaniesRouter = router({
  ...crud,

  import: authProcedure
    .input(
      z.object({
        rows: z.array(CompanyInputSchema),
        skipped: z.number().int().nonnegative().optional(),
        file_name: z.string().trim().min(1).max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      ctx.res.status(202);
      return companies.importRows(input, ctx.auth);
    }),

  findPotentialDuplicates: authProcedure
    .query(({ ctx }) => companies.findPotentialDuplicates(ctx.auth)),

  mergeCompanies: authProcedure
    .input(z.object({ target_id: idSchema, source_id: idSchema }))
    .mutation(({ input, ctx }) => companies.mergeCompanies(input.target_id, input.source_id, ctx.auth)),
});
