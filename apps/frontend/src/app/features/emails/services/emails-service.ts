/**
 * @file Service for interacting with the email backend via tRPC.
 */
import { Injectable } from '@angular/core';
import { EmailStatus } from '@common';

import { TRPCService } from '../../../backend-svc/trpc-service';
import { ComposePayload, DraftPayload } from '../ui/email-compose/email-compose';
import { EmailDraftType, EmailType } from 'common/src/lib/models';

/** Service for interacting with email backend via tRPC */
@Injectable({ providedIn: 'root' })
export class EmailsService extends TRPCService<'emails' | 'email_folders' | 'email_list'> {
  /**
   * Add a comment to an email.
   * @param id Email identifier
   * @param author_id ID of the user adding the comment
   * @param comment Comment text
   * @returns Promise for the mutation
   */
  public addComment(id: string, author_id: string, comment: string) {
    return this.api.emails.addComment.mutate({ id, author_id, comment });
  }

  /**
   * Assign an email to a user.
   * @param id Email identifier
   * @param user_id User ID to assign to
   * @returns Promise for the mutation
   */
  public assign(id: string, user_id: string | null) {
    return this.api.emails.assign.mutate({ id, user_id });
  }

  /**
   * Delete a comment from an email.
   * Adjust the endpoint/shape to your backend if different.
   */
  public deleteComment(email_id: string, comment_id: string) {
    return this.api.emails.deleteComment.mutate({ email_id, comment_id });
  }

  public deleteDraft(id: string) {
    return this.api.emails.deleteDraft.mutate({ id });
  }

  public getAllAttachments(id: string, options?: { includeInline: boolean }) {
    return this.api.emails.getAllAttachments.query({ email_id: id, options });
  }

  public getAttachmentCountByEmails() {
    return this.api.emails.getAttachmentCountByEmails.query();
  }

  public getAttachmentsByEmailId(id: string) {
    return this.api.emails.getAttachmentsByEmailId.query(id);
  }

  public getDraft(id: string) {
    return this.api.emails.getDraft.query(id) as Promise<EmailDraftType>;
  }

  public getEmailBody(id: string) {
    return this.api.emails.getEmailBody.query(id);
  }

  /**
   * Get a single email by its ID.
   * @param id Email identifier
   * @returns Promise resolving to the email details
   */
  public getEmailHeader(id: string) {
    return this.api.emails.getEmailHeader.query(id);
  }

  /**
   * Get email with headers and body combined for detailed view.
   * @param id Email identifier
   * @returns Promise resolving to email body and header data
   */
  public getEmailWithHeaders(id: string) {
    return this.api.emails.getEmailWithHeaders.query(id);
  }

  /**
   * Fetch all emails for a given folder.
   * @param folderId Identifier of the folder to query
   * @returns Promise resolving to the emails in the folder
   */
  // TODO: paging and infinite scrolling
  public getEmails(folderId: string) {
    return this.api.emails.getEmails.query({ folderId });
  }

  /**
   * Retrieve the list of available email folders.
   * @returns Promise resolving to an array of folders
   */
  public getFolders() {
    return this.api.emails.getFolders.query();
  }

  /**
   * Retrieve the list of available email folders with email counts.
   * @returns Promise resolving to an array of folders with email_count property
   */
  public getFoldersWithCounts() {
    return this.api.emails.getFoldersWithCounts.query();
  }

  public hasAttachment(id: string) {
    return this.api.emails.hasAttachment.query(id);
  }

  public saveDraft(input: DraftPayload) {
    return this.api.emails.saveDraft.mutate(input);
  }

  // Fetch/FormData fallback
  public async sendEmail(input: ComposePayload): Promise<EmailType> {
    const fd = new FormData();
    fd.set('to', JSON.stringify(input.to));
    fd.set('cc', JSON.stringify(input.cc));
    fd.set('bcc', JSON.stringify(input.bcc));
    fd.set('subject', input.subject);
    fd.set('html', input.html);
    input.attachments.forEach((f) => fd.append('attachments', f, f.name));

    const res = await fetch('/api/emails/send', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Failed to send email');
    return res.json() as Promise<EmailType>;
  }

  public setFavourite(id: string, favourite: boolean) {
    return this.api.emails.setFavourite.mutate({ id, favourite });
  }

  public setStatus(id: string, status: EmailStatus) {
    return this.api.emails.setStatus.mutate({ id, status });
  }
}
