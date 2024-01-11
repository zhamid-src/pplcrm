import { AddTagObj, UpdateTagObj } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { TagsController } from '../controllers/tags.controller';

const tags = new TagsController();

export const TagsRouter = router({
  findOneByName: authProcedure.input(z.string()).query(({ input }) => tags.findOne(BigInt(input))),
  findOne: authProcedure.input(z.string()).query(({ input }) => tags.findOne(BigInt(input))),
  findAll: authProcedure.query(() => tags.findAll()),
  add: authProcedure.input(AddTagObj).mutation(({ input, ctx }) => tags.addTag(input, ctx.auth)),
  delete: authProcedure.input(z.string()).mutation(({ input }) => tags.delete(BigInt(input))),
  update: authProcedure
    .input(z.object({ id: z.string(), data: UpdateTagObj }))
    .mutation(({ input, ctx }) => tags.updateTag(BigInt(input.id), input.data, ctx.auth)),
});
