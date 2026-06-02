import { AddWorkflowObj, UpdateWorkflowObj, getAllOptions, idSchema } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { WorkflowsController } from './controller';

const workflows = new WorkflowsController();

export const WorkflowsRouter = router({
  getAllWithCounts: authProcedure
    .input(getAllOptions)
    .query(({ input, ctx }) => workflows.getAllWithCounts(ctx.auth.tenant_id, input)),
    
  count: authProcedure.query(({ ctx }) => workflows.getCount(ctx.auth.tenant_id)),
  
  getById: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => workflows.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),
    
  create: authProcedure
    .input(AddWorkflowObj)
    .mutation(async ({ input, ctx }) => {
      return workflows.add({
        ...input,
        tenant_id: ctx.auth.tenant_id,
        createdby_id: ctx.auth.user_id,
        updatedby_id: ctx.auth.user_id,
      } as any);
    }),
    
  update: authProcedure
    .input(z.object({ id: idSchema, data: UpdateWorkflowObj }))
    .mutation(async ({ input, ctx }) => {
      return workflows.update({
        tenant_id: ctx.auth.tenant_id,
        id: input.id,
        row: {
          ...input.data,
          updatedby_id: ctx.auth.user_id,
          updated_at: new Date(),
        } as any,
      });
    }),
    
  delete: authProcedure
    .input(idSchema)
    .mutation(async ({ input, ctx }) => {
      return workflows.delete(ctx.auth.tenant_id, input, ctx.auth.user_id);
    }),
    
  getSteps: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => workflows.getSteps(ctx.auth.tenant_id, input)),
    
  saveSteps: authProcedure
    .input(
      z.object({
        workflowId: idSchema,
        steps: z.array(
          z.object({
            delay_days: z.number().int().nonnegative(),
            delay_unit: z.enum(['days', 'hours']).default('days'),
            subject: z.string(),
            preview_text: z.string().nullable().optional(),
            html_content: z.string().nullable().optional(),
            plain_text_content: z.string().nullable().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return workflows.saveSteps(ctx.auth.tenant_id, input.workflowId, input.steps, ctx.auth.user_id);
    }),
    
  getEnrollments: authProcedure
    .input(z.object({ workflowId: idSchema, options: getAllOptions.optional() }))
    .query(({ input, ctx }) => workflows.getEnrollments(ctx.auth.tenant_id, input.workflowId, input.options)),
    
  enrollPerson: authProcedure
    .input(z.object({ workflowId: idSchema, personId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      return workflows.enrollPerson(ctx.auth.tenant_id, input.personId, input.workflowId, ctx.auth.user_id);
    }),
    
  cancelEnrollment: authProcedure
    .input(z.object({ enrollmentId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      return workflows.cancelEnrollment(ctx.auth.tenant_id, input.enrollmentId, ctx.auth.user_id);
    }),
});
