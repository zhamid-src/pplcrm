/**
 * tRPC router for managing list records and their members.
 */
import { AddListObj, UpdateListObj, getAllOptions } from '@common';

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
  return authProcedure.input(z.string()).mutation(({ input, ctx }) => lists.delete(ctx.auth.tenant_id, input));
}

function deleteLists() {
  return authProcedure
    .input(z.array(z.string()))
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
    .input(z.string())
    .query(({ input, ctx }) => lists.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }));
}

function getMembersHouseholds() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => lists.getHouseholdsByListId(ctx.auth, input));
}

function getMembersPersons() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => lists.getPersonsByListId(ctx.auth, input));
}

function update() {
  return authProcedure
    .input(z.object({ id: z.string(), data: UpdateListObj }))
    .mutation(({ input, ctx }) => lists.updateList(input.id, input.data, ctx.auth));
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
});
