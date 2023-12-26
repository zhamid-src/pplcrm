import { addTagObj } from "@common";
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
  add: authProcedure.input(addTagObj).mutation(({ input, ctx }) => {
    return tags.add(input, ctx.auth);
  }),
});

export type TagssRouter = typeof tagsRouter;
