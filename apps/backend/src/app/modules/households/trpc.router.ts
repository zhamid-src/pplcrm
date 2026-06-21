import { UpdateHouseholdsObj, idSchema } from '../../../../../../libs/common/src';

import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { HouseholdsController } from './controller';
import { createCrudRouter } from '../../lib/crud-router';

const households = new HouseholdsController();

const crud = createCrudRouter(households, UpdateHouseholdsObj, UpdateHouseholdsObj);

export const HouseholdsRouter = router({
  ...crud,

  getAll: authProcedure.query(({ ctx }) => households.getAll(ctx.auth.tenant_id)),

  add: authProcedure.input(UpdateHouseholdsObj).mutation(({ input, ctx }) => households.addHousehold(input, ctx.auth)),

  deleteMany: authProcedure
    .input(z.array(idSchema).min(1, 'At least one ID is required'))
    .mutation(({ input, ctx }) => households.deleteManyForTenant(ctx.auth, input)),

  attachTag: authProcedure
    .input(
      z.object({
        id: idSchema,
        tag_name: z.string().trim().min(1, 'Tag name cannot be empty').max(50, 'Tag name too long'),
        type: z.enum(['tag', 'issue']).default('tag').optional(),
      }),
    )
    .mutation(({ input, ctx }) => households.attachTag(input.id, input.tag_name, input.type ?? 'tag', ctx.auth)),

  detachTag: authProcedure
    .input(
      z.object({
        id: idSchema,
        tag_name: z.string().trim().min(1, 'Tag name cannot be empty').max(50, 'Tag name too long'),
        type: z.enum(['tag', 'issue']).default('tag').optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      households.detachTag(ctx.auth.tenant_id, input.id, input.tag_name, input.type ?? 'tag', ctx.auth.user_id),
    ),

  getTags: authProcedure
    .input(z.union([idSchema, z.object({ id: idSchema, type: z.enum(['tag', 'issue']).optional() })]))
    .query(({ input, ctx }) => {
      const id = typeof input === 'string' ? input : input.id;
      const type = typeof input === 'string' ? undefined : input.type;
      return households.getTags(id, ctx.auth, type);
    }),

  getDistinctTags: authProcedure
    .input(z.enum(['tag', 'issue']).optional())
    .query(({ input, ctx }) => households.getDistinctTags(ctx.auth, input)),

  getAllWithPeopleCount: authProcedure
    .input(z.any().optional())
    .query(({ input, ctx }) => households.getAllWithPeopleCount(ctx.auth, input)),

  getPeopleCount: authProcedure.input(idSchema).query(({ input, ctx }) => households.getPeopleCount(input, ctx.auth)),

  getPotentialDuplicates: authProcedure
    .input(
      z
        .object({
          page: z.number().int().positive().optional().default(1),
          pageSize: z.number().int().positive().optional().default(20),
        })
        .optional(),
    )
    .query(({ input, ctx }) => households.getPotentialDuplicates(ctx.auth, input)),

  mergeHouseholds: authProcedure
    .input(z.object({ target_id: idSchema, source_id: idSchema }))
    .mutation(({ input, ctx }) => households.mergeHouseholds(input.target_id, input.source_id, ctx.auth)),

  getLastFingerprintRecomputation: authProcedure.query(({ ctx }) =>
    households.getLastFingerprintRecomputation(ctx.auth.tenant_id),
  ),

  recomputeAddressFingerprints: authProcedure.mutation(({ ctx }) =>
    households.recomputeAddressFingerprints(ctx.auth.tenant_id),
  ),
});
