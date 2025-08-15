import { getAllEmailFolders } from '../config/email-folders.config';
import { EmailBodiesRepo } from '../repositories/emails/email-body.repo';
import { EmailCommentsRepo } from '../repositories/emails/email-comments.repo';
import { EmailAttachmentsRepo } from '../repositories/emails/email-attachments.repo';
import { EmailRepo } from '../repositories/emails/email.repo';
import { BaseController } from './base.controller';
import { OperationDataType } from 'common/src/lib/kysely.models';

/** Controller handling email operations */
export class EmailsController extends BaseController<'emails', EmailRepo> {
  private bodiesRepo = new EmailBodiesRepo();
  private commentsRepo = new EmailCommentsRepo();
  private attachmentsRepo = new EmailAttachmentsRepo();

  constructor() {
    super(new EmailRepo());
  }

  /** Add a comment to an email */
  public addComment(tenant_id: string, email_id: string, author_id: string, comment: string) {
    return this.commentsRepo.add({
      row: {
        tenant_id,
        email_id,
        author_id,
        comment,
        createdby_id: author_id,
        updatedby_id: author_id,
      } as OperationDataType<'emails', 'insert'>,
    });
  }

  /** Assign an email to a user */
  public assignEmail(tenant_id: string, id: string, user_id: string | null) {
    return this.update({ tenant_id, id, row: { assigned_to: user_id } as OperationDataType<'emails', 'insert'> });
  }

  /** Delete a comment from an email */
  public deleteComment(tenant_id: string, _email_id: string, comment_id: string) {
    return this.commentsRepo.delete({ tenant_id, id: comment_id /*, email_id */ });
  }

  /** Return a single email and its comments */
  public async getEmailBody(tenant_id: string, id: string) {
    const email = await this.bodiesRepo.getById({ tenant_id, id });
    return email;
  }

  /** Return a single email with headers, recipients, and comments */
  public async getEmailHeader(tenant_id: string, id: string) {
    const [emailWithHeaders, comments, attachments] = await Promise.all([
      this.getRepo().getEmailWithHeadersAndRecipients(tenant_id, id),
      this.commentsRepo.getForEmail(tenant_id, id),
      this.attachmentsRepo.getByEmailId(tenant_id, id),
    ]);
    return { email: emailWithHeaders, comments, attachments };
  }

  /** Return all emails for the given folder */
  public getEmails(user_id: string, tenant_id: string, folder_id: string) {
    return this.getRepo().getByFolder(user_id, tenant_id, folder_id);
  }

  /** Return all folders, sorted by sort_order */
  public getFolders(_tenant_id: string) {
    // Return hardcoded folders configuration (same for all tenants)
    return Promise.resolve(getAllEmailFolders());
  }

  /** Return all folders for a tenant with email counts */
  public async getFoldersWithCounts(user_id: string, tenant_id: string) {
    const [folders, emailCounts] = await Promise.all([
      this.getFolders(tenant_id),
      this.getRepo().getEmailCountsByFolder(user_id, tenant_id),
    ]);

    // Add email count to each folder
    return folders.map((folder: any) => ({
      ...folder,
      email_count: emailCounts[folder.id] || 0,
    }));
  }

  public setFavourite(tenant_id: string, id: string, favourite: boolean) {
    return this.getRepo().setFavourite(tenant_id, id, favourite);
  }

  /** Update email status (open/closed/resolved) */
  public setStatus(tenant_id: string, id: string, status: 'open' | 'closed' | 'resolved') {
    return this.getRepo().setStatus(tenant_id, id, status);
  }
}
