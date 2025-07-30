import { UpdateHouseholdsObj } from '@common';

import { z } from 'zod';

import { authProcedure, router } from '../../trpc';
import { HouseholdsController } from '../controllers/households.controller';
import { OperationDataType } from 'common/src/lib/kysely.models';

/**
 * Add a new household to the system.
 */
function add() {
  return authProcedure
    .input(UpdateHouseholdsObj)
    .mutation(({ input, ctx }) => households.addHousehold(input, ctx.auth));
}

/**
 * Attach a tag to a household.
 * If the tag does not exist, it will be created.
 */
function attachTag() {
  return authProcedure
    .input(z.object({ id: z.string(), tag_name: z.string() }))
    .mutation(({ input, ctx }) => households.attachTag(input.id, input.tag_name, ctx.auth));
}

function count() {
  return authProcedure.query(({ ctx }) => households.getCount(ctx.auth.tenant_id));
}

/**
 * Delete multiple households by ID.
 */
function deleteMany() {
  return authProcedure
    .input(z.array(z.string()))
    .mutation(({ input, ctx }) => households.deleteMany(ctx.auth.tenant_id, input));
}

/**
 * Delete a single household by ID.
 */
function deleteOne() {
  return authProcedure.input(z.string()).mutation(({ input, ctx }) => households.delete(ctx.auth.tenant_id, input));
}

/**
 * Detach a tag from a household.
 */
function detachTag() {
  return authProcedure
    .input(z.object({ id: z.string(), tag_name: z.string() }))
    .mutation(({ input, ctx }) => households.detachTag(ctx.auth.tenant_id, input.id, input.tag_name));
}

/**
 * Get all households for the tenant.
 */
function getAll() {
  return authProcedure.query(({ ctx }) => households.getAll(ctx.auth.tenant_id));
}

/**
 * Get all households along with the count of people in each.
 */
function getAllWithPeopleCount() {
  return authProcedure.query(({ ctx }) => households.getAllWithPeopleCount(ctx.auth));
}

/**
 * Get a household by its ID.
 */
function getById() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => households.getById({ tenant_id: ctx.auth.tenant_id, id: input }));
}

/**
 * Get all distinct tags used across all households for the tenant.
 */
function getDistinctTags() {
  return authProcedure.query(({ ctx }) => households.getDistinctTags(ctx.auth));
}

/**
 * Get all tags associated with a specific household.
 */
function getTags() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => households.getTags(input, ctx.auth));
}

/**
 * Update a household's information.
 */
function update() {
  return authProcedure.input(z.object({ id: z.string(), data: UpdateHouseholdsObj })).mutation(({ input, ctx }) =>
    households.update({
      tenant_id: ctx.auth.tenant_id,
      id: input.id,
      row: input.data as OperationDataType<'households', 'update'>,
    }),
  );
}

const households = new HouseholdsController();

/**
 * HouseholdsRouter: All endpoints for managing household data
 */
export const HouseholdsRouter = router({
  add: add(),
  count: count(),
  getAll: getAll(),
  update: update(),
  getTags: getTags(),
  getById: getById(),
  attachTag: attachTag(),
  detachTag: detachTag(),
  delete: deleteOne(),
  deleteMany: deleteMany(),
  getDistinctTags: getDistinctTags(),
  getAllWithPeopleCount: getAllWithPeopleCount(),
});
