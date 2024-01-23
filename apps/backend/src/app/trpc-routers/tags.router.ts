import { AddTagObj, UpdateTagObj } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { TagsController } from '../controllers/tags.controller';

const tags = new TagsController();

/**
 * Tags endpoints
 */
export const TagsRouter = router({
  add: add(),
  getAll: getAll(),
  delete: deleteTag(),
  update: update(),
  getById: getById(),
  getByName: getByName(),
  findByName: findByName(),
});
function findByName() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => tags.findByName(input, ctx.auth!));
}

function update() {
  return authProcedure
    .input(z.object({ id: z.string(), data: UpdateTagObj }))
    .mutation(({ input, ctx }) => tags.updateTag(BigInt(input.id), input.data, ctx.auth!));
}

function deleteTag() {
  return authProcedure.input(z.string()).mutation(({ input }) => tags.delete(BigInt(input)));
}

function add() {
  return authProcedure.input(AddTagObj).mutation(({ input, ctx }) => tags.addTag(input, ctx.auth!));
}

function getAll() {
  return authProcedure.query(() => tags.getAll());
}

function getById() {
  return authProcedure.input(z.string()).query(({ input }) => tags.getById(BigInt(input)));
}

function getByName() {
  return authProcedure.input(z.string()).query(({ input }) => tags.getById(BigInt(input)));
}
