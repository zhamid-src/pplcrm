import {
  idSchema,
  getAllOptions,
  AddVolunteerEventObj,
  UpdateVolunteerEventObj,
  AddVolunteerShiftObj,
  UpdateVolunteerShiftObj,
} from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { VolunteerEventsController } from './controller';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';

const ctrl = new VolunteerEventsController();

export const VolunteerRouter = router({
  // Events
  getAll: authProcedure
    .input(getAllOptions)
    .query(wrapTrpc(({ input, ctx }) => ctrl.getAllEvents(ctx.auth, input))),

  getById: authProcedure
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => ctrl.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }))),

  add: authProcedure
    .input(AddVolunteerEventObj)
    .mutation(wrapTrpc(({ input, ctx }) => ctrl.addEvent(input, ctx.auth))),

  update: authProcedure
    .input(z.object({ id: idSchema, data: UpdateVolunteerEventObj }))
    .mutation(wrapTrpc(({ input, ctx }) => ctrl.updateEvent(input.id, input.data, ctx.auth))),

  delete: authProcedure
    .input(idSchema)
    .mutation(wrapTrpc(({ input, ctx }) => ctrl.delete(ctx.auth.tenant_id, input, ctx.auth.user_id))),

  // Shifts / Roster
  getShiftsForEvent: authProcedure
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => ctrl.getShiftsForEvent(input, ctx.auth))),

  signupVolunteer: authProcedure
    .input(AddVolunteerShiftObj)
    .mutation(wrapTrpc(({ input, ctx }) => ctrl.signupVolunteer(input, ctx.auth))),

  updateShift: authProcedure
    .input(z.object({ id: idSchema, data: UpdateVolunteerShiftObj }))
    .mutation(wrapTrpc(({ input, ctx }) => ctrl.updateShift(input.id, input.data, ctx.auth))),

  deleteShift: authProcedure
    .input(idSchema)
    .mutation(wrapTrpc(({ input, ctx }) => ctrl.deleteShift(input, ctx.auth))),

  // Person Specific History/Stats
  getHistoryForPerson: authProcedure
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => ctrl.getHistoryForPerson(input, ctx.auth))),

  getVolunteerStats: authProcedure
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => ctrl.getVolunteerStats(input, ctx.auth))),
});
