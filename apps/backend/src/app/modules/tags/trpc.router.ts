/**
 * tRPC router handling tag creation, modification, deletion, and search
 * operations for tenant-specific tags.
 */
import { AddTagObj, UpdateTagObj, exportCsvInput, exportCsvResponse, getAllOptions } from '@common';

import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { TagsController } from './controller';

/**
 * Add a new tag to the database.
 */
function add() {
  return authProcedure.input(AddTagObj).mutation(({ input, ctx }) => tags.addTag(input, ctx.auth));
}

/**
 * Get the total number of tags for the current tenant.
 * @returns Count of tag records.
 */
function count() {
  return authProcedure.query(({ ctx }) => tags.getCount(ctx.auth.tenant_id));
}

/**
 * Delete a single tag by its ID.
 */
function deleteTag() {
  return authProcedure.input(z.string()).mutation(({ input, ctx }) => tags.delete(ctx.auth.tenant_id, input));
}

/**
 * Delete multiple tags by their IDs.
 */
function deleteTags() {
  return authProcedure
    .input(z.array(z.string()))
    .mutation(({ input, ctx }) => tags.deleteMany(ctx.auth.tenant_id, input));
}

/**
 * Find tags by partial or full name (autocomplete).
 */
function findByName() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => tags.findByName(input, ctx.auth));
}

/**
 * Get all tags for the current tenant.
 */
function getAll() {
  return authProcedure.query(({ ctx }) => tags.getAll(ctx.auth.tenant_id));
}

/**
 * Get all tags along with counts of their usage in people and households.
 */
function getAllWithCounts() {
  return authProcedure.input(getAllOptions).query(({ input, ctx }) => tags.getAllWithCounts(ctx.auth.tenant_id, input));
}

/**
 * Get a single tag by its ID.
 */
function getById() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => tags.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }));
}

/**
 * Update a tag by ID with new data.
 */
function update() {
  return authProcedure
    .input(z.object({ id: z.string(), data: UpdateTagObj }))
    .mutation(({ input, ctx }) => tags.updateTag(input.id, input.data, ctx.auth));
}

function exportCsv() {
  return authProcedure
    .input(exportCsvInput)
    .output(exportCsvResponse)
    .mutation(({ input, ctx }) => tags.exportCsv({ tenant_id: ctx.auth.tenant_id, ...(input ?? {}) }));
}

const tags = new TagsController();

/** Router exposing tag-related procedures. */
export const TagsRouter = router({
  add: add(),
  count: count(),
  getAll: getAll(),
  update: update(),
  getById: getById(),
  delete: deleteTag(),
  deleteMany: deleteTags(),
  findByName: findByName(),
  getAllWithCounts: getAllWithCounts(),
  exportCsv: exportCsv(),
});
