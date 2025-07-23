import { AddTagObj, UpdateTagObj } from "@common";

import { z } from "zod";

import { authProcedure, router } from "../../trpc";
import { TagsController } from "../controllers/tags.controller";

/**
 * Add a new tag to the database.
 */
function add() {
  return authProcedure.input(AddTagObj).mutation(({ input, ctx }) => tags.addTag(input, ctx.auth!));
}

/**
 * Delete a single tag by its ID.
 */
function deleteTag() {
  return authProcedure.input(z.string()).mutation(({ input, ctx }) => tags.delete(ctx.auth!.tenant_id!, input));
}

/**
 * Delete multiple tags by their IDs.
 */
function deleteTags() {
  return authProcedure
    .input(z.array(z.string()))
    .mutation(({ input, ctx }) => tags.deleteMany(ctx.auth!.tenant_id!, input));
}

/**
 * Find tags by partial or full name (autocomplete).
 */
function findByName() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => tags.findByName(input, ctx.auth!));
}

/**
 * Get all tags for the current tenant.
 */
function getAll() {
  return authProcedure.query(({ ctx }) => tags.getAll(ctx.auth!.tenant_id!));
}

/**
 * Get all tags along with counts of their usage in people and households.
 */
function getAllWithCounts() {
  return authProcedure.query(({ ctx }) => tags.getAllWithCounts(ctx.auth!.tenant_id!));
}

/**
 * Get a single tag by its ID.
 */
function getById() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => tags.getById({ tenant_id: ctx.auth!.tenant_id!, id: input }));
}

/**
 * Update a tag by ID with new data.
 */
function update() {
  return authProcedure
    .input(z.object({ id: z.string(), data: UpdateTagObj }))
    .mutation(({ input, ctx }) => tags.updateTag(input.id, input.data, ctx.auth!));
}

const tags = new TagsController();

/**
 * Tags endpoints
 */
export const TagsRouter = router({
  add: add(),
  getAll: getAll(),
  update: update(),
  getById: getById(),
  delete: deleteTag(),
  deleteMany: deleteTags(),
  findByName: findByName(),
  getAllWithCounts: getAllWithCounts(),
});
