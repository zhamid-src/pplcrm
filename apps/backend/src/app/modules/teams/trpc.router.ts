import { AddTeamObj, UpdateTeamObj, getAllOptions, idSchema } from '@common';

import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { TeamsController } from './controller';

const controller = new TeamsController();

function getAll() {
  return authProcedure
    .input(getAllOptions.optional())
    .query(({ ctx, input }) => controller.getAllTeams(ctx.auth.tenant_id, input));
}

function getById() {
  return authProcedure
    .input(idSchema)
    .query(({ ctx, input }) => controller.getById(ctx.auth, input));
}

function add() {
  return authProcedure
    .input(AddTeamObj)
    .mutation(({ ctx, input }) => controller.addTeam(ctx.auth, input));
}

function update() {
  return authProcedure
    .input(z.object({ id: idSchema, data: UpdateTeamObj }))
    .mutation(({ ctx, input }) => controller.updateTeam(ctx.auth, input.id, input.data));
}

function remove() {
  return authProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => controller.deleteTeam(ctx.auth, input));
}

function getForVolunteer() {
  return authProcedure
    .input(idSchema)
    .query(({ ctx, input }) => controller.getTeamsForVolunteer(ctx.auth, input));
}

function getAssignedLists() {
  return authProcedure
    .input(idSchema)
    .query(({ ctx, input }) => controller.getAssignedLists(ctx.auth, input));
}

export const TeamsRouter = router({
  getAll: getAll(),
  getById: getById(),
  add: add(),
  update: update(),
  delete: remove(),
  getForVolunteer: getForVolunteer(),
  getAssignedLists: getAssignedLists(),
});
