import {
  AddWorkflowObj,
  AddWorkflowStepObj,
  UpdateWorkflowObj,
  getAllOptions,
  idSchema,
} from '../../../../../../libs/common/src';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { WorkflowsController } from './controller';
import { createCrudRouter } from '../../lib/crud-router';

const workflows = new WorkflowsController();

const crud = createCrudRouter(workflows, AddWorkflowObj, UpdateWorkflowObj);

export const WorkflowsRouter = router({
  ...crud,

  // Spec §16 list (/automations) — enriched rows (recipe data + RUNS 30D + LAST RUN) and summary.
  list: authProcedure.query(({ ctx }) => workflows.getWorkflowsList(ctx.auth.tenant_id)),

  getSteps: authProcedure.input(idSchema).query(({ input, ctx }) => workflows.getSteps(ctx.auth.tenant_id, input)),

  saveSteps: authProcedure
    .input(z.object({ workflowId: idSchema, steps: z.array(AddWorkflowStepObj) }))
    .mutation(async ({ input, ctx }) =>
      workflows.saveSteps(ctx.auth.tenant_id, input.workflowId, input.steps, ctx.auth.user_id),
    ),

  setStatus: authProcedure
    .input(z.object({ id: idSchema, status: z.enum(['active', 'paused']) }))
    .mutation(async ({ input, ctx }) =>
      workflows.setStatus(ctx.auth.tenant_id, input.id, input.status, ctx.auth.user_id),
    ),

  getRuns: authProcedure
    .input(z.object({ workflowId: idSchema, limit: z.number().int().positive().max(100).optional() }))
    .query(({ input, ctx }) => workflows.getRuns(ctx.auth.tenant_id, input.workflowId, input.limit)),

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
