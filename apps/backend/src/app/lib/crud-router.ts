import { getAllOptions, idSchema, exportCsvInput, exportCsvResponse } from '../../../../../libs/common/src';
import { z } from 'zod';
import { authProcedure } from '../../trpc';
import type { BaseController } from './base.controller';

export function createCrudRouter<
  TController extends BaseController<any, any>,
  TInsertSchema extends z.ZodTypeAny,
  TUpdateSchema extends z.ZodTypeAny,
>(controller: TController, insertSchema: TInsertSchema, updateSchema: TUpdateSchema) {
  return {
    getAll: authProcedure
      .input(getAllOptions)
      .query(({ input, ctx }) => controller.getAllWithCounts(ctx.auth.tenant_id, input)),
    getAllWithCounts: authProcedure
      .input(getAllOptions)
      .query(({ input, ctx }) => controller.getAllWithCounts(ctx.auth.tenant_id, input)),
    getById: authProcedure
      .input(idSchema)
      .query(({ input, ctx }) => controller.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),
    add: authProcedure.input(insertSchema).mutation(({ input, ctx }) =>
      controller.add({
        ...(input as Record<string, unknown>),
        tenant_id: ctx.auth.tenant_id,
        createdby_id: ctx.auth.user_id,
        updatedby_id: ctx.auth.user_id,
      }),
    ),
    create: authProcedure.input(insertSchema).mutation(({ input, ctx }) =>
      controller.add({
        ...(input as Record<string, unknown>),
        tenant_id: ctx.auth.tenant_id,
        createdby_id: ctx.auth.user_id,
        updatedby_id: ctx.auth.user_id,
      }),
    ),
    update: authProcedure.input(z.object({ id: idSchema, data: updateSchema })).mutation(({ input, ctx }) => {
      const { id, data } = input as unknown as { id: string; data: Record<string, unknown> };
      return controller.update({
        tenant_id: ctx.auth.tenant_id,
        id,
        row: { ...data, updatedby_id: ctx.auth.user_id },
      });
    }),
    delete: authProcedure
      .input(idSchema)
      .mutation(({ input, ctx }) => controller.delete(ctx.auth.tenant_id, input, ctx.auth.user_id)),
    deleteMany: authProcedure
      .input(z.array(idSchema).min(1, 'At least one ID is required'))
      .mutation(({ input, ctx }) => controller.deleteMany(ctx.auth.tenant_id, input)),
    count: authProcedure.query(({ ctx }) => controller.getCount(ctx.auth.tenant_id)),
    exportCsv: authProcedure
      .input(exportCsvInput)
      .output(exportCsvResponse)
      .mutation(({ input, ctx }) =>
        controller.exportCsv({ tenant_id: ctx.auth.tenant_id, ...(input ?? {}) }, ctx.auth),
      ),
  };
}
