import { z } from 'zod';

import { authProcedure, router } from '../../trpc';
import { EmailsController } from '../controllers/emails.controller';

const emails = new EmailsController();

function getFolders() {
  return authProcedure.query(({ ctx }) => emails.getFolders(ctx.auth.tenant_id));
}

function getEmails() {
  return authProcedure
    .input(z.object({ folderId: z.string() }))
    .query(({ input, ctx }) => emails.getEmails(ctx.auth.tenant_id, input.folderId));
}

function getEmail() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => emails.getEmail(ctx.auth.tenant_id, input));
}

function addComment() {
  return authProcedure
    .input(z.object({ id: z.string(), author_id: z.string(), comment: z.string() }))
    .mutation(({ input, ctx }) => emails.addComment(ctx.auth.tenant_id, input.id, input.author_id, input.comment));
}

function assign() {
  return authProcedure
    .input(z.object({ id: z.string(), user_id: z.string() }))
    .mutation(({ input, ctx }) => emails.assignEmail(ctx.auth.tenant_id, input.id, input.user_id));
}

/**
 * Emails endpoints
 */
export const EmailsRouter = router({
  getFolders: getFolders(),
  getEmails: getEmails(),
  getEmail: getEmail(),
  addComment: addComment(),
  assign: assign(),
});
