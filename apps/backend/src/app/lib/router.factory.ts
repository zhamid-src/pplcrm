import { z, ZodTypeAny } from 'zod';
import { authProcedure, router } from '../trpc';
import { getAllOptions } from '@common';

export interface CrudSchemas {
  add: ZodTypeAny;
}

export function createTaggableRouter(controller: any, schemas: CrudSchemas, extra: Record<string, any> = {}) {
  const base = {
    add: authProcedure.input(schemas.add).mutation(({ input, ctx }) => controller.add(input, ctx.auth)),
    count: authProcedure.query(({ ctx }) => controller.getCount(ctx.auth.tenant_id)),
    getAll: authProcedure.input(getAllOptions).query(({ input, ctx }) => controller.getAll(ctx.auth.tenant_id, input)),
    update: authProcedure
      .input(z.object({ id: z.string(), data: schemas.add }))
      .mutation(({ input, ctx }) =>
        controller.update({ tenant_id: ctx.auth.tenant_id, id: input.id, row: input.data }),
      ),
    getTags: authProcedure.input(z.string()).query(({ input, ctx }) => controller.getTags(input, ctx.auth)),
    getById: authProcedure
      .input(z.string())
      .query(({ input, ctx }) => controller.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),
    attachTag: authProcedure
      .input(z.object({ id: z.string(), tag_name: z.string() }))
      .mutation(({ input, ctx }) => controller.attachTag(input.id, input.tag_name, ctx.auth)),
    detachTag: authProcedure
      .input(z.object({ id: z.string(), tag_name: z.string() }))
      .mutation(({ input, ctx }) => controller.detachTag({ tenant_id: ctx.auth.tenant_id, id: input.id, name: input.tag_name })),
    delete: authProcedure.input(z.string()).mutation(({ input, ctx }) => controller.delete(ctx.auth.tenant_id, input)),
    deleteMany: authProcedure
      .input(z.array(z.string()))
      .mutation(({ input, ctx }) => controller.deleteMany(ctx.auth.tenant_id, input)),
    getDistinctTags: authProcedure.query(({ ctx }) => controller.getDistinctTags(ctx.auth)),
  };

  return router({ ...base, ...extra });
}
