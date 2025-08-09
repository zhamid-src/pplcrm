/**
 * tRPC router for email management including folders, individual emails,
 * comments, and assignment of emails to users.
 */
import { z } from 'zod';

import { authProcedure, router } from '../../trpc';
import { EmailsController } from '../controllers/emails.controller';

const emails = new EmailsController();

/** Retrieve all email folders for the current tenant. */
function getFolders() {
  return authProcedure.query(({ ctx }) => emails.getFolders(ctx.auth.tenant_id));
}

/**
 * Retrieve emails within a specified folder for the tenant.
 * @returns A list of email summaries.
 */
function getEmails() {
  return authProcedure
    .input(z.object({ folderId: z.string() }))
    .query(({ input, ctx }) => emails.getEmails(ctx.auth.tenant_id, input.folderId));
}

/**
 * Retrieve a single email by its ID.
 * @returns The requested email record.
 */
function getEmail() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => emails.getEmail(ctx.auth.tenant_id, input));
}

/**
 * Add a comment to an existing email.
 * @returns The newly created comment record.
 */
function addComment() {
  return authProcedure
    .input(z.object({ id: z.string(), author_id: z.string(), comment: z.string() }))
    .mutation(({ input, ctx }) => emails.addComment(ctx.auth.tenant_id, input.id, input.author_id, input.comment));
}

/**
 * Assign an email to a specific user for follow-up.
 * @returns Success status of the assignment.
 */
function assign() {
  return authProcedure
    .input(z.object({ id: z.string(), user_id: z.string() }))
    .mutation(({ input, ctx }) => emails.assignEmail(ctx.auth.tenant_id, input.id, input.user_id));
}

/** Router exposing email-related procedures. */
export const EmailsRouter = router({
  getFolders: getFolders(),
  getEmails: getEmails(),
  getEmail: getEmail(),
  addComment: addComment(),
  assign: assign(),
});
