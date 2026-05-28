import { idSchema, getAllOptions } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { CompaniesController } from './controller';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';

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

export const CompaniesRouter = router({
  add: authProcedure
    .input(CompanyInputSchema)
    .mutation(wrapTrpc(({ input, ctx }) => companies.addCompany(input, ctx.auth))),
  
  delete: authProcedure
    .input(idSchema)
    .mutation(wrapTrpc(({ input, ctx }) => companies.delete(ctx.auth.tenant_id, input, ctx.auth.user_id))),
  
  deleteMany: authProcedure
    .input(z.array(idSchema).min(1, 'At least one ID is required'))
    .mutation(wrapTrpc(({ input, ctx }) => companies.deleteMany(ctx.auth.tenant_id, input))),
  
  getAll: authProcedure
    .input(getAllOptions)
    .query(wrapTrpc(({ input, ctx }) => companies.getAllCompanies(ctx.auth, input))),
  
  getById: authProcedure
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => companies.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }))),
  
  update: authProcedure
    .input(z.object({ id: idSchema, data: CompanyInputSchema.partial() }))
    .mutation(wrapTrpc(({ input, ctx }) => companies.updateCompany(input.id, input.data, ctx.auth))),

  findPotentialDuplicates: authProcedure
    .query(wrapTrpc(({ ctx }) => companies.findPotentialDuplicates(ctx.auth))),

  mergeCompanies: authProcedure
    .input(z.object({ target_id: idSchema, source_id: idSchema }))
    .mutation(wrapTrpc(({ input, ctx }) => companies.mergeCompanies(input.target_id, input.source_id, ctx.auth))),
});
