import { AddTeamObj, UpdateTeamObj, getAllOptions } from '@common';

import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { TeamsController } from './controller';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';

const controller = new TeamsController();

function getAll() {
  return authProcedure
    .input(getAllOptions.optional())
    .query(wrapTrpc(({ ctx, input }) => controller.getAllTeams(ctx.auth.tenant_id, input)));
}

function getById() {
  return authProcedure
    .input(z.string())
    .query(wrapTrpc(({ ctx, input }) => controller.getById(ctx.auth, input)));
}

function add() {
  return authProcedure
    .input(AddTeamObj)
    .mutation(wrapTrpc(({ ctx, input }) => controller.addTeam(ctx.auth, input)));
}

function update() {
  return authProcedure
    .input(z.object({ id: z.string(), data: UpdateTeamObj }))
    .mutation(wrapTrpc(({ ctx, input }) => controller.updateTeam(ctx.auth, input.id, input.data)));
}

function remove() {
  return authProcedure
    .input(z.string())
    .mutation(wrapTrpc(({ ctx, input }) => controller.deleteTeam(ctx.auth, input)));
}

export const TeamsRouter = router({
  getAll: getAll(),
  getById: getById(),
  add: add(),
  update: update(),
  delete: remove(),
});
