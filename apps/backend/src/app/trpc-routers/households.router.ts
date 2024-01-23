import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { HouseholdsController } from '../controllers/households.controller';

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

const households = new HouseholdsController();
/**
 * Household endpoints
 */
export const HouseholdsRouter = router({
  getAll: getAll(),
  getById: getById(),
  getTags: getTags(),
  getDistinctTags: getDistinctTags(),
  getAllWithPeopleCount: getAllWithPeopleCount(),
});
