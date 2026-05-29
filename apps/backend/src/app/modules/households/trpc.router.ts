/**
 * tRPC router providing CRUD operations and tag management for
 * household records within a tenant.
 */
import { UpdateHouseholdsObj, exportCsvInput, exportCsvResponse, getAllOptions, idSchema } from '@common';

import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { HouseholdsController } from './controller';
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
    .input(
      z.object({
        id: idSchema,
        tag_name: z.string().trim().min(1, 'Tag name cannot be empty').max(50, 'Tag name too long'),
        type: z.enum(['tag', 'issue']).default('tag').optional(),
      })
    )
    .mutation(({ input, ctx }) => households.attachTag(input.id, input.tag_name, input.type ?? 'tag', ctx.auth));
}

/**
 * Get the total number of households for the current tenant.
 * @returns Count of household records.
 */
function count() {
  return authProcedure.query(({ ctx }) => households.getCount(ctx.auth.tenant_id));
}

/**
 * Delete multiple households by ID.
 */
function deleteMany() {
  return authProcedure
    .input(z.array(idSchema).min(1, 'At least one ID is required'))
    .mutation(({ input, ctx }) => households.deleteManyForTenant(ctx.auth, input));
}

/**
 * Delete a single household by ID.
 */
function deleteOne() {
  return authProcedure.input(idSchema).mutation(({ input, ctx }) => households.delete(ctx.auth.tenant_id, input, ctx.auth.user_id));
}

/**
 * Detach a tag from a household.
 */
function detachTag() {
  return authProcedure
    .input(
      z.object({
        id: idSchema,
        tag_name: z.string().trim().min(1, 'Tag name cannot be empty').max(50, 'Tag name too long'),
        type: z.enum(['tag', 'issue']).default('tag').optional(),
      })
    )
    .mutation(({ input, ctx }) => households.detachTag(ctx.auth.tenant_id, input.id, input.tag_name, input.type ?? 'tag', ctx.auth.user_id));
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
  return authProcedure
    .input(getAllOptions)
    .query(({ input, ctx }) => households.getAllWithPeopleCount(ctx.auth, input));
}

/**
 * Get the count of people in a specific household.
 */
function getPeopleCount() {
  return authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => households.getPeopleCount(input, ctx.auth));
}

/**
 * Get a household by its ID.
 */
function getById() {
  return authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => households.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }));
}

/**
 * Get all distinct tags used across all households for the tenant.
 */
function getDistinctTags() {
  return authProcedure
    .input(z.enum(['tag', 'issue']).optional())
    .query(({ input, ctx }) => households.getDistinctTags(ctx.auth, input));
}

/**
 * Get all tags associated with a specific household.
 */
function getTags() {
  return authProcedure
    .input(z.union([idSchema, z.object({ id: idSchema, type: z.enum(['tag', 'issue']).optional() })]))
    .query(({ input, ctx }) => {
      const id = typeof input === 'string' ? input : input.id;
      const type = typeof input === 'string' ? undefined : input.type;
      return households.getTags(id, ctx.auth, type);
    });
}

function exportCsv() {
  return authProcedure
    .input(exportCsvInput)
    .output(exportCsvResponse)
    .mutation(({ input, ctx }) =>
      households.exportCsv({ tenant_id: ctx.auth.tenant_id, ...(input ?? {}) }, ctx.auth),
    );
}

/**
 * Update a household's information.
 */
function update() {
  return authProcedure.input(z.object({ id: idSchema, data: UpdateHouseholdsObj })).mutation(({ input, ctx }) =>
    households.update({
      tenant_id: ctx.auth.tenant_id,
      id: input.id,
      row: {
        ...input.data,
        updatedby_id: ctx.auth.user_id,
      } as OperationDataType<'households', 'update'>,
    }),
  );
}

function findPotentialDuplicates() {
  return authProcedure.query(({ ctx }) => households.findPotentialDuplicates(ctx.auth));
}

function mergeHouseholds() {
  return authProcedure
    .input(z.object({ target_id: idSchema, source_id: idSchema }))
    .mutation(({ input, ctx }) => households.mergeHouseholds(input.target_id, input.source_id, ctx.auth));
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
  getPeopleCount: getPeopleCount(),
  exportCsv: exportCsv(),
  findPotentialDuplicates: findPotentialDuplicates(),
  mergeHouseholds: mergeHouseholds(),
});
