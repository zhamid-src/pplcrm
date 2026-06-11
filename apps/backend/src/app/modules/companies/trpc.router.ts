import { idSchema } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { CompaniesController } from './controller';
import { createCrudRouter } from '../../lib/crud-router';

const companies = new CompaniesController();

const CompanyInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().trim().max(1000).optional().nullable(),
  website: z.string().trim().max(255).optional().nullable(),
  email: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  industry: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(10000).optional().nullable(),
});

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
