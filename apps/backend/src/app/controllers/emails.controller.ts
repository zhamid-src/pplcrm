import { getAllEmailFolders } from '../config/email-folders.config';
import { EmailAttachmentsRepo } from '../repositories/emails/email-attachments.repo';
import { EmailBodiesRepo } from '../repositories/emails/email-body.repo';
import { EmailCommentsRepo } from '../repositories/emails/email-comments.repo';
import { EmailDraftsRepo } from '../repositories/emails/email-drafts.repo';
import { EmailRepo } from '../repositories/emails/email.repo';
import { BaseController } from './base.controller';
import { ALL_FOLDERS, EmailStatus } from 'common/src/lib/emails';
import { OperationDataType } from 'common/src/lib/kysely.models';

/** Controller handling email operations */
export class EmailsController extends BaseController<'emails', EmailRepo> {
  private attachmentsRepo = new EmailAttachmentsRepo();
  private bodiesRepo = new EmailBodiesRepo();
  private commentsRepo = new EmailCommentsRepo();
  private draftsRepo = new EmailDraftsRepo();

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

  public deleteDraft(tenant_id: string, _user_id: string, id: string) {
    return this.draftsRepo.delete({ tenant_id, id });
  }

  public getAllAttachments(tenant_id: string, email_id: string, options?: { includeInline: boolean }) {
    return this.attachmentsRepo.getAllAttachments(tenant_id, email_id, options);
  }

  public getAttachmentCountByEmails(tenant_id: string) {
    this.attachmentsRepo.getCountByEmails(tenant_id);
  }

  public getAttachmentsByEmailId(tenant_id: string, email_id: string) {
    return this.attachmentsRepo.getByEmailId(tenant_id, email_id);
  }

  public getDraft(tenant_id: string, _user_id: string, id: string) {
    return this.draftsRepo.getById({ tenant_id, /*user_id,*/ id });
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
  public async getEmails(user_id: string, tenant_id: string, folder_id: string) {
    if (folder_id === ALL_FOLDERS.DRAFTS) {
      const drafts = await this.draftsRepo.listByUser(tenant_id, user_id);
      return drafts.map((d: any) => ({
        id: d.id,
        folder_id,
        from_email: '',
        to_email: Array.isArray(d.to_list) ? d.to_list.join(', ') : '',
        subject: d.subject,
        preview: '',
        assigned_to: undefined,
        updated_at: d.updated_at,
        is_favourite: false,
        att_count: 0,
        has_attachment: false,
        status: 'open',
      }));
    }
    return this.getRepo().getByFolderWithAttachmentFlag(user_id, tenant_id, folder_id);
  }

  /** Return all folders, sorted by sort_order */
  public getFolders(_tenant_id: string) {
    // Return hardcoded folders configuration (same for all tenants)
    return Promise.resolve(getAllEmailFolders());
  }

  /** Return all folders for a tenant with email counts */
  public async getFoldersWithCounts(user_id: string, tenant_id: string) {
    const [folders, emailCounts, draftCount] = await Promise.all([
      this.getFolders(tenant_id),
      this.getRepo().getEmailCountsByFolder(user_id, tenant_id),
      this.draftsRepo.countByUser(tenant_id, user_id),
    ]);

    return folders.map((folder: any) => ({
      ...folder,
      email_count: folder.id === ALL_FOLDERS.DRAFTS ? draftCount : emailCounts[folder.id] || 0,
    }));
  }

  public async hasAttachment(tenant_id: string, email_id: string) {
    this.attachmentsRepo.hasAttachment(tenant_id, email_id);
  }

  public saveDraft(
    tenant_id: string,
    user_id: string,
    draft: {
      id?: string;
      to_list: string[];
      cc_list?: string[];
      bcc_list?: string[];
      subject?: string;
      body_html?: string;
    },
  ) {
    return this.draftsRepo.saveDraft(tenant_id, user_id, draft);
  }

  public setFavourite(tenant_id: string, id: string, favourite: boolean) {
    return this.getRepo().setFavourite(tenant_id, id, favourite);
  }

  /** Update email status (open/closed/resolved) */
  public setStatus(tenant_id: string, id: string, status: EmailStatus) {
    return this.getRepo().setStatus(tenant_id, id, status);
  }
}
