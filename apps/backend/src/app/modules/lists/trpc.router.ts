/**
 * tRPC router for managing list records and their members.
 */
import { AddListObj, UpdateListObj, exportCsvInput, exportCsvResponse, getAllOptions, idSchema } from '@common';

import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { ListsController } from './controller';

function add() {
  return authProcedure.input(AddListObj).mutation(({ input, ctx }) => lists.addList(input, ctx.auth));
}

function count() {
  return authProcedure.query(({ ctx }) => lists.getCount(ctx.auth.tenant_id));
}



function deleteList() {
  return authProcedure.input(idSchema).mutation(({ input, ctx }) => lists.delete(ctx.auth.tenant_id, input));
}

function deleteLists() {
  return authProcedure
    .input(z.array(idSchema).min(1, 'At least one ID is required'))
    .mutation(({ input, ctx }) => lists.deleteMany(ctx.auth.tenant_id, input));
}

function getAll() {
  return authProcedure.query(({ ctx }) => lists.getAll(ctx.auth.tenant_id));
}

function getAllWithCounts() {
  return authProcedure
    .input(getAllOptions)
    .query(({ input, ctx }) => lists.getAllWithCounts(ctx.auth.tenant_id, input));
}

function getById() {
  return authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => lists.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }));
}

function getMembersHouseholds() {
  return authProcedure.input(idSchema).query(({ input, ctx }) => lists.getHouseholdsByListId(ctx.auth, input));
}

function getMembersPersons() {
  return authProcedure.input(idSchema).query(({ input, ctx }) => lists.getPersonsByListId(ctx.auth, input));
}

function update() {
  return authProcedure
    .input(z.object({ id: idSchema, data: UpdateListObj }))
    .mutation(({ input, ctx }) => lists.updateList(input.id, input.data, ctx.auth));
}

function exportCsv() {
  return authProcedure
    .input(exportCsvInput)
    .output(exportCsvResponse)
    .mutation(({ input, ctx }) => lists.exportCsv({ tenant_id: ctx.auth.tenant_id, ...(input ?? {}) }, ctx.auth));
}

function refresh() {
  return authProcedure.input(idSchema).mutation(({ input, ctx }) => lists.refreshList(ctx.auth, input));
}

function getListStats() {
  return authProcedure.input(idSchema).query(({ input, ctx }) => lists.getListStats(ctx.auth, input));
}

const lists = new ListsController();

export const ListsRouter = router({
  add: add(),
  count: count(),
  getAll: getAll(),
  getAllWithCounts: getAllWithCounts(),
  getById: getById(),
  getMembersPersons: getMembersPersons(),
  getMembersHouseholds: getMembersHouseholds(),
  update: update(),
  delete: deleteList(),
  deleteMany: deleteLists(),
  exportCsv: exportCsv(),
  refresh: refresh(),
  getListStats: getListStats(),
});
