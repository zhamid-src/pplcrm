import { UpdatePersonsObj, getAllOptions } from '@common';
import { OperationDataType } from 'common/src/lib/kysely.models';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { PersonsController } from '../controllers/persons.controller';

function add() {
  return authProcedure
    .input(UpdatePersonsObj)
    .mutation(({ input }) => persons.add(input as OperationDataType<'persons', 'insert'>));
}

function addTag() {
  return authProcedure
    .input(z.object({ id: z.string(), tag_name: z.string() }))
    .mutation(({ input, ctx }) => persons.addTag(input.id, input.tag_name, ctx.auth!));
}

function deletePerson() {
  return authProcedure.input(z.string()).mutation(({ input }) => persons.delete(input));
}

function getAll() {
  return authProcedure.input(getAllOptions).query(({ input }) => persons.getAll(input));
}

function getAllWithAddress() {
  return authProcedure.input(getAllOptions).query(({ input }) => persons.getAllWithAddress(input));
}

function getByHouseholdId() {
  return authProcedure
    .input(z.object({ id: z.string(), options: getAllOptions }))
    .query(({ input, ctx }) => persons.getByHouseholdId(input.id, ctx.auth!, input.options));
}

function getById() {
  return authProcedure.input(z.string()).query(({ input }) => persons.getById(input));
}

function getDistinctTags() {
  return authProcedure.query(({ ctx }) => persons.getDistinctTags(ctx.auth!));
}

function getTags() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => persons.getTags(input, ctx.auth!));
}

function removeTag() {
  return authProcedure
    .input(z.object({ id: z.string(), tag_name: z.string() }))
    .mutation(({ input }) => persons.removeTag(input.id, input.tag_name));
}

function update() {
  return authProcedure
    .input(z.object({ id: z.string(), data: UpdatePersonsObj }))
    .mutation(({ input }) =>
      persons.update(input.id, input.data as OperationDataType<'persons', 'update'>),
    );
}

const persons = new PersonsController();
/**
 * Persons endpoints
 */
export const PersonsRouter = router({
  add: add(),
  getAll: getAll(),
  delete: deletePerson(),
  update: update(),
  addTag: addTag(),
  getTags: getTags(),
  getById: getById(),
  removeTag: removeTag(),
  getDistinctTags: getDistinctTags(),
  getByHouseholdId: getByHouseholdId(),
  getAllWithAddress: getAllWithAddress(),
});
