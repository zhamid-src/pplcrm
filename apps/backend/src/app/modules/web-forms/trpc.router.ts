import {
  AddWebFormObj,
  CreateFormObj,
  UpdateFormObj,
  UpdateWebFormObj,
  getAllOptions,
} from '../../../../../../libs/common/src';
import { z } from 'zod';

import { authProcedure as baseAuthProcedure, publicProcedure, router } from '../../../trpc';
import { planFeatureGate } from '../billing/plan-gate';
import { WebFormsController } from './controller';

const webForms = new WebFormsController();

// FEATURE_MATRIX plan gate: forms are Grassroots-and-up; mutations below are blocked on Free.
const authProcedure = baseAuthProcedure.use(planFeatureGate('forms'));

export const WebFormsRouter = router({
  getAllWithCounts: authProcedure
    .input(getAllOptions)
    .query(({ input, ctx }) => webForms.getAllWithCounts(ctx.auth.tenant_id, input)),
  getById: authProcedure
    .input(z.string().uuid())
    .query(({ input, ctx }) => webForms.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),
  add: authProcedure.input(AddWebFormObj).mutation(({ input, ctx }) => webForms.addForm(input, ctx.auth)),
  update: authProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdateWebFormObj }))
    .mutation(({ input, ctx }) => webForms.updateForm(input.id, input.data, ctx.auth)),
  delete: authProcedure
    .input(z.string().uuid())
    .mutation(({ input, ctx }) => webForms.delete(ctx.auth.tenant_id, input, ctx.auth.user_id)),
  getSubmissionsCount: authProcedure
    .input(z.string().uuid())
    .query(({ input, ctx }) => webForms.getSubmissionsCount(input, ctx.auth.tenant_id)),
  confirmSubscription: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ input }) => webForms.confirmSubscription(input.token)),

  // --- North Star "living funnel" lifecycle (new Forms experience) ---
  list: authProcedure.query(({ ctx }) => webForms.listForms(ctx.auth.tenant_id)),
  getForEdit: authProcedure
    .input(z.string().uuid())
    .query(({ input, ctx }) => webForms.getFormForEdit(input, ctx.auth.tenant_id)),
  create: authProcedure.input(CreateFormObj).mutation(({ input, ctx }) => webForms.createForm(input, ctx.auth)),
  updateLive: authProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdateFormObj }))
    .mutation(({ input, ctx }) => webForms.updateFormLive(input.id, input.data, ctx.auth)),
  publish: authProcedure.input(z.string().uuid()).mutation(({ input, ctx }) => webForms.publishForm(input, ctx.auth)),
  unpublish: authProcedure
    .input(z.string().uuid())
    .mutation(({ input, ctx }) => webForms.unpublishForm(input, ctx.auth)),
  archive: authProcedure.input(z.string().uuid()).mutation(({ input, ctx }) => webForms.archiveForm(input, ctx.auth)),
  restore: authProcedure.input(z.string().uuid()).mutation(({ input, ctx }) => webForms.restoreForm(input, ctx.auth)),
  deleteDraft: authProcedure
    .input(z.string().uuid())
    .mutation(({ input, ctx }) => webForms.deleteForm(input, ctx.auth)),
  submissions: authProcedure
    .input(z.object({ id: z.string().uuid(), cursor: z.number().optional() }))
    .query(({ input, ctx }) => webForms.getFormSubmissions(input.id, ctx.auth.tenant_id, input.cursor)),
});
