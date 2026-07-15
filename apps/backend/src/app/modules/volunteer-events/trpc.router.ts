import {
  idSchema,
  getAllOptions,
  AddVolunteerEventObj,
  UpdateVolunteerEventObj,
  AddVolunteerShiftObj,
  UpdateVolunteerShiftObj,
} from '../../../../../../libs/common/src';
import { z } from 'zod';
import { authProcedure as baseAuthProcedure, router } from '../../../trpc';
import { planFeatureGate } from '../billing/plan-gate';
import { VolunteerEventsController } from './controller';

const ctrl = new VolunteerEventsController();

// FEATURE_MATRIX plan gate: volunteer management is Grassroots-and-up; mutations below are blocked on Free.
const authProcedure = baseAuthProcedure.use(planFeatureGate('volunteers'));

export const VolunteerRouter = router({
  // Events
  getAll: authProcedure.input(getAllOptions).query(({ input, ctx }) => ctrl.getAllEvents(ctx.auth, input)),

  getById: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => ctrl.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),

  add: authProcedure.input(AddVolunteerEventObj).mutation(({ input, ctx }) => ctrl.addEvent(input, ctx.auth)),

  checkSlugUnique: authProcedure
    .input(z.object({ slug: z.string(), excludeId: z.string().nullable().optional() }))
    .query(({ input, ctx }) => ctrl.checkSlugUnique(input.slug, input.excludeId || null, ctx.auth)),

  update: authProcedure
    .input(z.object({ id: idSchema, data: UpdateVolunteerEventObj }))
    .mutation(({ input, ctx }) => ctrl.updateEvent(input.id, input.data, ctx.auth)),

  delete: authProcedure
    .input(idSchema)
    .mutation(({ input, ctx }) => ctrl.delete(ctx.auth.tenant_id, input, ctx.auth.user_id)),

  // Shifts / Roster
  getShiftsForEvent: authProcedure.input(idSchema).query(({ input, ctx }) => ctrl.getShiftsForEvent(input, ctx.auth)),

  signupVolunteer: authProcedure
    .input(AddVolunteerShiftObj)
    .mutation(({ input, ctx }) => ctrl.signupVolunteer(input, ctx.auth)),

  updateShift: authProcedure
    .input(z.object({ id: idSchema, data: UpdateVolunteerShiftObj }))
    .mutation(({ input, ctx }) => ctrl.updateShift(input.id, input.data, ctx.auth)),

  deleteShift: authProcedure.input(idSchema).mutation(({ input, ctx }) => ctrl.deleteShift(input, ctx.auth)),

  // Person Specific History/Stats
  getHistoryForPerson: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => ctrl.getHistoryForPerson(input, ctx.auth)),

  getVolunteerStats: authProcedure.input(idSchema).query(({ input, ctx }) => ctrl.getVolunteerStats(input, ctx.auth)),
});
