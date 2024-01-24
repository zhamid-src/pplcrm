import { UpdateHouseholdsObj } from '@common';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { HouseholdsController } from '../controllers/households.controller';

function add() {
  return authProcedure
    .input(UpdateHouseholdsObj)
    .mutation(({ input, ctx }) => households.addHousehold(input, ctx.auth!));
}

function addTag() {
  return authProcedure
    .input(z.object({ id: z.string(), tag_name: z.string() }))
    .mutation(({ input, ctx }) => households.addTag(input.id, input.tag_name, ctx.auth!));
}

function deleteHousehold() {
  return authProcedure
    .input(z.string())
    .mutation(({ input, ctx }) => households.delete(ctx.auth!.tenant_id!, input));
}

function getAll() {
  return authProcedure.query(({ ctx }) => households.getAll(ctx.auth!.tenant_id!));
}

function getAllWithPeopleCount() {
  return authProcedure.query(({ ctx }) => households.getAllWithPeopleCount(ctx.auth!));
}

function getById() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => households.getById({ tenant_id: ctx.auth!.tenant_id!, id: input }));
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
    .mutation(({ input, ctx }) =>
      households.removeTag(ctx.auth!.tenant_id!, input.id, input.tag_name),
    );
}

function update() {
  return authProcedure
    .input(z.object({ id: z.string(), data: UpdateHouseholdsObj }))
    .mutation(({ input, ctx }) =>
      households.update({
        tenant_id: ctx.auth!.tenant_id!,
        id: input.id,
        row: input.data as OperationDataType<'households', 'update'>,
      }),
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
