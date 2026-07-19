import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import {
  idSchema,
  getAllOptions,
  AddEventObj,
  UpdateEventObj,
  AddTicketTypeObj,
  UpdateTicketTypeObj,
  ReorderTicketTypesObj,
  AddRegistrationObj,
  UpdateRegistrationObj,
} from '../../../../../../libs/common/src';
import { EventsController } from './controller';

const ctrl = new EventsController();

export const EventsRouter = router({
  // Events
  getAll: authProcedure.input(getAllOptions).query(({ input, ctx }) => ctrl.getAllEvents(ctx.auth, input)),

  getById: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => ctrl.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),

  add: authProcedure.input(AddEventObj).mutation(({ input, ctx }) => ctrl.addEvent(input, ctx.auth)),

  checkSlugUnique: authProcedure
    .input(z.object({ slug: z.string(), excludeId: z.string().nullable().optional() }))
    .query(({ input, ctx }) => ctrl.checkSlugUnique(input.slug, input.excludeId || null, ctx.auth)),

  update: authProcedure
    .input(z.object({ id: idSchema, data: UpdateEventObj }))
    .mutation(({ input, ctx }) => ctrl.updateEvent(input.id, input.data, ctx.auth)),

  delete: authProcedure
    .input(idSchema)
    .mutation(({ input, ctx }) => ctrl.delete(ctx.auth.tenant_id, input, ctx.auth.user_id)),

  // Ticket types
  getTicketTypesForEvent: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => ctrl.getTicketTypesForEvent(input, ctx.auth)),

  addTicketType: authProcedure
    .input(AddTicketTypeObj)
    .mutation(({ input, ctx }) => ctrl.addTicketType(input, ctx.auth)),

  updateTicketType: authProcedure
    .input(z.object({ id: idSchema, data: UpdateTicketTypeObj }))
    .mutation(({ input, ctx }) => ctrl.updateTicketType(input.id, input.data, ctx.auth)),

  deleteTicketType: authProcedure.input(idSchema).mutation(({ input, ctx }) => ctrl.deleteTicketType(input, ctx.auth)),

  reorderTicketTypes: authProcedure
    .input(ReorderTicketTypesObj)
    .mutation(({ input, ctx }) => ctrl.reorderTicketTypes(input, ctx.auth)),

  // Registrations
  getRegistrationsForEvent: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => ctrl.getRegistrationsForEvent(input, ctx.auth)),

  addRegistration: authProcedure
    .input(AddRegistrationObj)
    .mutation(({ input, ctx }) => ctrl.addRegistration(input, ctx.auth)),

  checkIn: authProcedure.input(idSchema).mutation(({ input, ctx }) => ctrl.checkIn(input, ctx.auth)),

  updateRegistration: authProcedure
    .input(z.object({ id: idSchema, data: UpdateRegistrationObj }))
    .mutation(({ input, ctx }) => ctrl.updateRegistration(input.id, input.data, ctx.auth)),

  deleteRegistration: authProcedure
    .input(idSchema)
    .mutation(({ input, ctx }) => ctrl.deleteRegistration(input, ctx.auth)),

  // Person-specific history & stats
  getHistoryForPerson: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => ctrl.getHistoryForPerson(input, ctx.auth)),

  getStatsForPerson: authProcedure.input(idSchema).query(({ input, ctx }) => ctrl.getEventStats(input, ctx.auth)),
});
