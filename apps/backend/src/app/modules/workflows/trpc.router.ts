import { AddWorkflowObj, UpdateWorkflowObj, getAllOptions, idSchema } from '../../../../../../libs/common/src';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { WorkflowsController } from './controller';
import { createCrudRouter } from '../../lib/crud-router';

const workflows = new WorkflowsController();

const crud = createCrudRouter(workflows, AddWorkflowObj, UpdateWorkflowObj);

export const WorkflowsRouter = router({
  ...crud,

  getSteps: authProcedure.input(idSchema).query(({ input, ctx }) => workflows.getSteps(ctx.auth.tenant_id, input)),

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
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) =>
      workflows.saveSteps(ctx.auth.tenant_id, input.workflowId, input.steps, ctx.auth.user_id),
    ),

  getEnrollments: authProcedure
    .input(z.object({ workflowId: idSchema, options: getAllOptions.optional() }))
    .query(({ input, ctx }) => workflows.getEnrollments(ctx.auth.tenant_id, input.workflowId, input.options)),

  enrollPerson: authProcedure
    .input(z.object({ workflowId: idSchema, personId: idSchema }))
    .mutation(async ({ input, ctx }) =>
      workflows.enrollPerson(ctx.auth.tenant_id, input.personId, input.workflowId, ctx.auth.user_id),
    ),

  cancelEnrollment: authProcedure
    .input(z.object({ enrollmentId: idSchema }))
    .mutation(async ({ input, ctx }) =>
      workflows.cancelEnrollment(ctx.auth.tenant_id, input.enrollmentId, ctx.auth.user_id),
    ),
});
