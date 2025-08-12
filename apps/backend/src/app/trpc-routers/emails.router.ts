/**
 * tRPC router for email management including folders, individual emails,
 * comments, and assignment of emails to users.
 */
import { z } from 'zod';

import { authProcedure, router } from '../../trpc';
import { EmailsController } from '../controllers/emails.controller';

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
    .input(z.object({ id: z.string(), user_id: z.string().nullable() }))
    .mutation(({ input, ctx }) => emails.assignEmail(ctx.auth.tenant_id, input.id, input.user_id));
}

function getEmailBody() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => emails.getEmailBody(ctx.auth.tenant_id, input));
}

/**
 * Retrieve a single email by its ID.
 * @returns The requested email record.
 */
function getEmailHeader() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => emails.getEmailHeader(ctx.auth.tenant_id, input));
}

/**
 * Retrieve email body and headers combined for detailed view.
 * @returns Email body with headers and recipient information.
 */
function getEmailWithHeaders() {
  return authProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const [emailBody, emailHeader] = await Promise.all([
      emails.getEmailBody(ctx.auth.tenant_id, input),
      emails.getEmailHeader(ctx.auth.tenant_id, input),
    ]);

    return {
      body: emailBody,
      header: emailHeader,
    };
  });
}

/**
 * Retrieve emails within a specified folder for the tenant.
 * @returns A list of email summaries.
 */
function getEmails() {
  return authProcedure
    .input(z.object({ folderId: z.string() }))
    .query(({ input, ctx }) => emails.getEmails(ctx.auth.user_id, ctx.auth.tenant_id, input.folderId));
}

/** Retrieve all email folders for the current tenant. */
function getFolders() {
  return authProcedure.query(({ ctx }) => emails.getFolders(ctx.auth.tenant_id));
}

/** Retrieve all email folders with email counts for the current tenant. */
function getFoldersWithCounts() {
  return authProcedure.query(({ ctx }) => emails.getFoldersWithCounts(ctx.auth.user_id, ctx.auth.tenant_id));
}

function setFavourite() {
  return authProcedure
    .input(z.object({ id: z.string(), favourite: z.boolean() }))
    .mutation(({ input, ctx }) => emails.setFavourite(ctx.auth.tenant_id, input.id, input.favourite));
}

function setStatus() {
  return authProcedure
    .input(z.object({ id: z.string(), status: z.enum(['open', 'closed', 'resolved']) }))
    .mutation(({ input, ctx }) => emails.setStatus(ctx.auth.tenant_id, input.id, input.status));
}

const emails = new EmailsController();

/** Router exposing email-related procedures. */
export const EmailsRouter = router({
  getFolders: getFolders(),
  getFoldersWithCounts: getFoldersWithCounts(),
  getEmails: getEmails(),
  getEmailBody: getEmailBody(),
  getEmailHeader: getEmailHeader(),
  getEmailWithHeaders: getEmailWithHeaders(),
  addComment: addComment(),
  assign: assign(),
  setFavourite: setFavourite(),
  setStatus: setStatus(),
});
