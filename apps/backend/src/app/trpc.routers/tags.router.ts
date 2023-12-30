import { AddTagObj } from "@common";
import { z } from "zod";
import { authProcedure, router } from "../../trpc";
import { TagsHelper } from "../trpc.handler/tags.helper";

const tags = new TagsHelper();

export const tagsRouter = router({
  getOneById: authProcedure.input(z.bigint()).query(({ input }) => {
    return tags.getOneById(input);
  }),
  getOneByName: authProcedure.input(z.string()).query(({ input }) => {
    return tags.getOneByName(input);
  }),
  getAll: authProcedure.query(() => {
    return tags.getAll();
  }),
  add: authProcedure.input(AddTagObj).mutation(({ input, ctx }) => {
    return tags.add(input, ctx.auth);
  }),
  update: authProcedure
    .input(z.object({ id: z.number(), data: AddTagObj }))
    .mutation(({ input }) => tags.update(input.id, input.data)),
  delete: authProcedure
    .input(z.number())
    .mutation(({ input }) => tags.delete(input)),
  deleteMany: authProcedure
    .input(z.array(z.number()))
    .mutation(({ input }) => tags.deleteMany(input)),
});

export type TagssRouter = typeof tagsRouter;
