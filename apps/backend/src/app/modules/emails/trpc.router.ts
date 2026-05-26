/**
 * tRPC router for email management including folders, individual emails,
 * comments, and assignment of emails to users.
 */
import { idSchema } from '@common';
import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { EmailsController } from './controller';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';

/**
 * Add a comment to an existing email.
 * @returns The newly created comment record.
 */
function addComment() {
  return authProcedure
    .input(z.object({ id: idSchema, author_id: idSchema, comment: z.string().trim().min(1, 'Comment cannot be empty').max(5000, 'Comment too long') }))
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
    .input(z.object({ id: idSchema, user_id: idSchema.nullable(), assigned_to_name: z.string().optional() }))
    .mutation(wrapTrpc(({ input, ctx }) =>
      emails.assignEmail(ctx.auth.tenant_id, input.id, input.user_id, ctx.auth.user_id, input.assigned_to_name ?? null),
    ));
}

function deleteComment() {
  return authProcedure
    .input(z.object({ email_id: idSchema, comment_id: idSchema }))
    .mutation(wrapTrpc(({ input, ctx }) => emails.deleteComment(ctx.auth.tenant_id, input.email_id, input.comment_id)));
}

function deleteDraft() {
  return authProcedure
    .input(z.object({ id: idSchema }))
    .mutation(wrapTrpc(({ input, ctx }) => emails.deleteDraft(ctx.auth.tenant_id, ctx.auth.user_id, input.id)));
}

function deleteEmail() {
  return authProcedure
    .input(idSchema)
    .mutation(wrapTrpc(({ input, ctx }) => emails.deleteMany(ctx.auth.tenant_id, [input])));
}

function deleteEmails() {
  return authProcedure
    .input(z.array(idSchema).min(1, 'At least one ID is required'))
    .mutation(wrapTrpc(({ input, ctx }) => emails.deleteMany(ctx.auth.tenant_id, input)));
}

function getAllAttachments() {
  return authProcedure
    .input(z.object({ email_id: idSchema, options: z.object({ includeInline: z.boolean() }).optional() }))
    .query(wrapTrpc(({ input, ctx }) => emails.getAllAttachments(ctx.auth.tenant_id, input.email_id, input.options)));
}

function getAttachmentsByEmailId() {
  return authProcedure
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => emails.getAttachmentsByEmailId(ctx.auth.tenant_id, input)));
}

function getDraft() {
  return authProcedure
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => emails.getDraft(ctx.auth.tenant_id, ctx.auth.user_id, input)));
}

function getEmailBody() {
  return authProcedure
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => emails.getEmailBody(ctx.auth.tenant_id, input)));
}

/**
 * Retrieve a single email by its ID.
 * @returns The requested email record.
 */
function getEmailHeader() {
  return authProcedure
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => emails.getEmailHeader(ctx.auth.tenant_id, input)));
}

/**
 * Retrieve email body and headers combined for detailed view.
 * @returns Email body with headers and recipient information.
 */
function getEmailWithHeaders() {
  return authProcedure.input(idSchema).query(
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
    .input(z.object({ folderId: idSchema }))
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
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => emails.hasAttachment(ctx.auth.tenant_id, input)));
}

function hasAttachmentByEmailIds() {
  return authProcedure
    .input(z.array(idSchema))
    .query(wrapTrpc(({ input, ctx }) => emails.hasAttachmentByEmailIds(ctx.auth.tenant_id, input)));
}

function restoreFromTrash() {
  return authProcedure
    .input(z.array(idSchema))
    .mutation(wrapTrpc(({ input, ctx }) => emails.restoreFromTrash(ctx.auth.tenant_id, input)));
}

function saveDraft() {
  return authProcedure
    .input(
      z.object({
        id: idSchema.optional(),
        to: z.array(z.string().trim().email('Invalid recipient email address')).optional().default([]),
        cc: z.array(z.string().trim().email('Invalid CC email address')).optional(),
        bcc: z.array(z.string().trim().email('Invalid BCC email address')).optional(),
        subject: z.string().trim().max(500, 'Subject is too long').optional(),
        html: z.string().max(100000, 'HTML body is too long').optional(),
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
    .input(z.object({ id: idSchema, favourite: z.boolean() }))
    .mutation(wrapTrpc(({ input, ctx }) => emails.setFavourite(ctx.auth.tenant_id, input.id, input.favourite)));
}

function setStatus() {
  return authProcedure
    .input(z.object({ id: idSchema, status: z.enum(['open', 'closed']) }))
    .mutation(wrapTrpc(({ input, ctx }) =>
      emails.setStatus(ctx.auth.tenant_id, input.id, input.status, ctx.auth.user_id),
    ));
}

/**
 * Retrieve all activity log entries for a given email.
 * @returns List of activity rows with user names, ordered newest-first.
 */
function getActivities() {
  return authProcedure
    .input(idSchema)
    .query(wrapTrpc(({ input, ctx }) => emails.getActivitiesForEmail(ctx.auth.tenant_id, input)));
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
  getActivities: getActivities(),
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
