import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { HouseholdsController } from '../controllers/households.controller';

function addTag() {
  return authProcedure
    .input(z.object({ id: z.string(), tag_name: z.string() }))
    .mutation(({ input, ctx }) => households.addTag(input.id, input.tag_name, ctx.auth!));
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

const households = new HouseholdsController();
/**
 * Household endpoints
 */
export const HouseholdsRouter = router({
  addTag: addTag(),
  getAll: getAll(),
  getById: getById(),
  getTags: getTags(),
  removeTag: removeTag(),
  getDistinctTags: getDistinctTags(),
  getAllWithPeopleCount: getAllWithPeopleCount(),
});
