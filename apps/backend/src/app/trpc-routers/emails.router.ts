/**
 * tRPC router for email management including folders, individual emails,
 * comments, and assignment of emails to users.
 */
import { z } from 'zod';

import { authProcedure, router } from '../../trpc';
import { EmailsController } from '../controllers/emails.controller';
import { wrapTrpc } from './utils/wrap-trpc';

/**
 * Add a comment to an existing email.
 * @returns The newly created comment record.
 */
function addComment() {
  return authProcedure
    .input(z.object({ id: z.string(), author_id: z.string(), comment: z.string() }))
    .mutation(
      wrapTrpc(({ input, ctx }) => emails.addComment(ctx.auth.tenant_id, input.id, input.author_id, input.comment)),
    );
}

/**
 * Assign an email to a specific user for follow-up.
 * @returns Success status of the assignment.
 */
function assign() {
  return authProcedure
    .input(z.object({ id: z.string(), user_id: z.string().nullable() }))
    .mutation(wrapTrpc(({ input, ctx }) => emails.assignEmail(ctx.auth.tenant_id, input.id, input.user_id)));
}

function deleteComment() {
  return authProcedure
    .input(z.object({ email_id: z.string(), comment_id: z.string() }))
    .mutation(wrapTrpc(({ input, ctx }) => emails.deleteComment(ctx.auth.tenant_id, input.email_id, input.comment_id)));
}

function deleteDraft() {
  return authProcedure
    .input(z.object({ id: z.string() }))
    .mutation(wrapTrpc(({ input, ctx }) => emails.deleteDraft(ctx.auth.tenant_id, ctx.auth.user_id, input.id)));
}

function deleteEmail() {
  return authProcedure
    .input(z.string())
    .mutation(wrapTrpc(({ input, ctx }) => emails.deleteMany(ctx.auth.tenant_id, [input])));
}

function deleteEmails() {
  return authProcedure
    .input(z.array(z.string()))
    .mutation(wrapTrpc(({ input, ctx }) => emails.deleteMany(ctx.auth.tenant_id, input)));
}

function getAllAttachments() {
  return authProcedure
    .input(z.object({ email_id: z.string(), options: z.object({ includeInline: z.boolean() }).optional() }))
    .query(wrapTrpc(({ input, ctx }) => emails.getAllAttachments(ctx.auth.tenant_id, input.email_id, input.options)));
}

function getAttachmentsByEmailId() {
  return authProcedure
    .input(z.string())
    .query(wrapTrpc(({ input, ctx }) => emails.getAttachmentsByEmailId(ctx.auth.tenant_id, input)));
}

function getDraft() {
  return authProcedure
    .input(z.string())
    .query(wrapTrpc(({ input, ctx }) => emails.getDraft(ctx.auth.tenant_id, ctx.auth.user_id, input)));
}

function getEmailBody() {
  return authProcedure
    .input(z.string())
    .query(wrapTrpc(({ input, ctx }) => emails.getEmailBody(ctx.auth.tenant_id, input)));
}

/**
 * Retrieve a single email by its ID.
 * @returns The requested email record.
 */
function getEmailHeader() {
  return authProcedure
    .input(z.string())
    .query(wrapTrpc(({ input, ctx }) => emails.getEmailHeader(ctx.auth.tenant_id, input)));
}

/**
 * Retrieve email body and headers combined for detailed view.
 * @returns Email body with headers and recipient information.
 */
function getEmailWithHeaders() {
  return authProcedure.input(z.string()).query(
    wrapTrpc(async ({ input, ctx }) => {
      const tenantId = ctx.auth.tenant_id;

      const [body, header] = await Promise.all([
        emails.getEmailBody(tenantId, input),
        emails.getEmailHeader(tenantId, input),
      ]);

      return { body, header };
    }),
  );
}

/**
 * Retrieve emails within a specified folder for the tenant.
 * @returns A list of email summaries.
 */
function getEmails() {
  return authProcedure
    .input(z.object({ folderId: z.string() }))
    .query(wrapTrpc(({ input, ctx }) => emails.getEmails(ctx.auth.user_id, ctx.auth.tenant_id, input.folderId)));
}

/** Retrieve all email folders for the current tenant. */
function getFolders() {
  return authProcedure.query(wrapTrpc(({ ctx }) => emails.getFolders(ctx.auth.tenant_id)));
}

/** Retrieve all email folders with email counts for the current tenant. */
function getFoldersWithCounts() {
  return authProcedure.query(wrapTrpc(({ ctx }) => emails.getFoldersWithCounts(ctx.auth.user_id, ctx.auth.tenant_id)));
}

function hasAttachment() {
  return authProcedure
    .input(z.string())
    .query(wrapTrpc(({ input, ctx }) => emails.hasAttachment(ctx.auth.tenant_id, input)));
}

function hasAttachmentByEmailIds() {
  return authProcedure
    .input(z.array(z.string()))
    .query(wrapTrpc(({ input, ctx }) => emails.hasAttachmentByEmailIds(ctx.auth.tenant_id, input)));
}

function restoreFromTrash() {
  return authProcedure
    .input(z.array(z.string()))
    .mutation(wrapTrpc(({ input, ctx }) => emails.restoreFromTrash(ctx.auth.tenant_id, input)));
}

function saveDraft() {
  return authProcedure
    .input(
      z.object({
        id: z.string().optional(),
        to: z.array(z.string()),
        cc: z.array(z.string()).optional(),
        bcc: z.array(z.string()).optional(),
        subject: z.string().optional(),
        html: z.string().optional(),
      }),
    )
    .mutation(
      wrapTrpc(({ input, ctx }) =>
        emails.saveDraft(ctx.auth.tenant_id, ctx.auth.user_id, {
          id: input.id,
          to_list: input.to,
          cc_list: input.cc ?? [],
          bcc_list: input.bcc ?? [],
          subject: input.subject ?? undefined,
          body_html: input.html ?? undefined,
        }),
      ),
    );
}

function setFavourite() {
  return authProcedure
    .input(z.object({ id: z.string(), favourite: z.boolean() }))
    .mutation(wrapTrpc(({ input, ctx }) => emails.setFavourite(ctx.auth.tenant_id, input.id, input.favourite)));
}

function setStatus() {
  return authProcedure
    .input(z.object({ id: z.string(), status: z.enum(['open', 'closed']) }))
    .mutation(wrapTrpc(({ input, ctx }) => emails.setStatus(ctx.auth.tenant_id, input.id, input.status)));
}

const emails = new EmailsController();

/** Router exposing email-related procedures. */
export const EmailsRouter = router({
  getFolders: getFolders(),
  getFoldersWithCounts: getFoldersWithCounts(),
  getEmails: getEmails(),
  getEmailBody: getEmailBody(),
  getDraft: getDraft(),
  getEmailHeader: getEmailHeader(),
  getEmailWithHeaders: getEmailWithHeaders(),
  addComment: addComment(),
  deleteComment: deleteComment(),
  deleteDraft: deleteDraft(),
  delete: deleteEmail(),
  deleteMany: deleteEmails(),
  assign: assign(),
  setFavourite: setFavourite(),
  setStatus: setStatus(),
  saveDraft: saveDraft(),
  restoreFromTrash: restoreFromTrash(),
  hasAttachment: hasAttachment(),
  getAllAttachments: getAllAttachments(),
  hasAttachmentByEmailIds: hasAttachmentByEmailIds(),
  getAttachmentsByEmailId: getAttachmentsByEmailId(),
});
