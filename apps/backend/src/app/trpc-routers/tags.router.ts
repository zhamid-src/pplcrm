import { AddTagObj, UpdateTagObj } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { TagsController } from '../controllers/tags.controller';

function add() {
  return authProcedure.input(AddTagObj).mutation(({ input, ctx }) => tags.addTag(input, ctx.auth!));
}

function deleteTag() {
  return authProcedure
    .input(z.string())
    .mutation(({ input, ctx }) => tags.delete(ctx.auth!.tenant_id!, input));
}

function findByName() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => tags.findByName(input, ctx.auth!));
}

function getAll() {
  return authProcedure.query(({ ctx }) => tags.getAll(ctx.auth!.tenant_id!));
}

function getById() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => tags.getById({ tenant_id: ctx.auth!.tenant_id!, id: input }));
}

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
  delete: deleteTag(),
  update: update(),
  getById: getById(),
  findByName: findByName(),
});
