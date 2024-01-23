import { UpdateHouseholdsObj } from '@common';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { HouseholdsController } from '../controllers/households.controller';

function add() {
  return authProcedure
    .input(UpdateHouseholdsObj)
    .mutation(({ input }) => households.add(input as OperationDataType<'households', 'insert'>));
}

function addTag() {
  return authProcedure
    .input(z.object({ id: z.string(), tag_name: z.string() }))
    .mutation(({ input, ctx }) => households.addTag(input.id, input.tag_name, ctx.auth!));
}

function deleteHousehold() {
  return authProcedure.input(z.string()).mutation(({ input }) => households.delete(input));
}

function getAll() {
  return authProcedure.query(() => households.getAll());
}

function getAllWithPeopleCount() {
  return authProcedure.query(() => households.getAllWithPeopleCount());
}

function getById() {
  return authProcedure.input(z.string()).query(({ input }) => households.getById(input));
}

function getDistinctTags() {
  return authProcedure.query(({ ctx }) => households.getDistinctTags(ctx.auth!));
}

function getTags() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => households.getTags(input, ctx.auth!));
}

function removeTag() {
  return authProcedure
    .input(z.object({ id: z.string(), tag_name: z.string() }))
    .mutation(({ input }) => households.removeTag(input.id, input.tag_name));
}

function update() {
  return authProcedure
    .input(z.object({ id: z.string(), data: UpdateHouseholdsObj }))
    .mutation(({ input }) =>
      households.update(input.id, input.data as OperationDataType<'households', 'update'>),
    );
}

const households = new HouseholdsController();
/**
 * Household endpoints
 */
export const HouseholdsRouter = router({
  add: add(),
  addTag: addTag(),
  delete: deleteHousehold(),
  update: update(),
  getAll: getAll(),
  getById: getById(),
  getTags: getTags(),
  removeTag: removeTag(),
  getDistinctTags: getDistinctTags(),
  getAllWithPeopleCount: getAllWithPeopleCount(),
});
