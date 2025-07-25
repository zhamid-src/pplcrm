import { UpdatePersonsObj, getAllOptions } from '@common';

import { z } from 'zod';

import { authProcedure, router } from '../../trpc';
import { PersonsController } from '../controllers/persons.controller';
import { OperationDataType } from 'common/src/lib/kysely.models';

/**
 * Add a new person to the database.
 */
function add() {
  return authProcedure.input(UpdatePersonsObj).mutation(({ input, ctx }) => persons.addPerson(input, ctx.auth!));
}

/**
 * Attach a tag to the specified person. If the tag doesn't exist, it is created.
 */
function attachTag() {
  return authProcedure
    .input(z.object({ id: z.string(), tag_name: z.string() }))
    .mutation(({ input, ctx }) => persons.attachTag(input.id, input.tag_name, ctx.auth!));
}

/**
 * Delete multiple persons by their IDs.
 */
function deleteMany() {
  return authProcedure
    .input(z.array(z.string()))
    .mutation(({ input, ctx }) => persons.deleteMany(ctx.auth!.tenant_id!, input));
}

/**
 * Delete a single person by ID.
 */
function deleteOne() {
  return authProcedure.input(z.string()).mutation(({ input, ctx }) => persons.delete(ctx.auth!.tenant_id!, input));
}

/**
 * Detach a tag from the specified person.
 */
function detachTag() {
  return authProcedure.input(z.object({ id: z.string(), tag_name: z.string() })).mutation(({ input, ctx }) =>
    persons.detachTag({
      tenant_id: ctx.auth!.tenant_id!,
      person_id: input.id,
      name: input.tag_name,
    }),
  );
}

/**
 * Get all people using the given options.
 */
function getAll() {
  return authProcedure.input(getAllOptions).query(({ input, ctx }) => persons.getAll(ctx.auth!.tenant_id!, input));
}

/**
 * Get all people with their full address and tags.
 */
function getAllWithAddress() {
  return authProcedure.input(getAllOptions).query(({ input, ctx }) => persons.getAllWithAddress(ctx.auth!, input));
}

/**
 * Get all people in a specific household.
 */
function getByHouseholdId() {
  return authProcedure
    .input(z.object({ id: z.string(), options: getAllOptions }))
    .query(({ input, ctx }) => persons.getByHouseholdId(input.id, ctx.auth!, input.options));
}

/**
 * Get a single person by their ID.
 */
function getById() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => persons.getById({ tenant_id: ctx.auth!.tenant_id!, id: input }));
}

/**
 * Get all distinct tags used on persons.
 */
function getDistinctTags() {
  return authProcedure.query(({ ctx }) => persons.getDistinctTags(ctx.auth!));
}

/**
 * Get all tags assigned to a specific person.
 */
function getTags() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => persons.getTags(input, ctx.auth!));
}

/**
 * Update an existing person with new data.
 */
function update() {
  return authProcedure.input(z.object({ id: z.string(), data: UpdatePersonsObj })).mutation(({ input, ctx }) =>
    persons.update({
      tenant_id: ctx.auth!.tenant_id!,
      id: input.id,
      row: input.data as OperationDataType<'persons', 'update'>,
    }),
  );
}

const persons = new PersonsController();

/**
 * Persons endpoints
 */
export const PersonsRouter = router({
  add: add(),
  getAll: getAll(),
  update: update(),
  getTags: getTags(),
  getById: getById(),
  attachTag: attachTag(),
  detachTag: detachTag(),
  delete: deleteOne(),
  deleteMany: deleteMany(),
  getDistinctTags: getDistinctTags(),
  getByHouseholdId: getByHouseholdId(),
  getAllWithAddress: getAllWithAddress(),
});
