import { BaseController } from './base.controller';
import { EmailRepo } from '../repositories/emails/email.repo';
import { EmailCommentsRepo } from '../repositories/emails/email-comments.repo';
import { EmailFoldersRepo } from '../repositories/emails/email-folders.repo';

/** Controller handling email operations */
export class EmailsController extends BaseController<'emails', EmailRepo> {
  private commentsRepo = new EmailCommentsRepo();
  private foldersRepo = new EmailFoldersRepo();

  constructor() {
    super(new EmailRepo());
  }

  /** Return all folders for a tenant */
  public getFolders(tenant_id: string) {
    return this.foldersRepo.getAll({ tenant_id: tenant_id as any });
  }

  /** Return all emails for the given folder */
  public getEmails(tenant_id: string, folder_id: string) {
    return this.getRepo().getByFolder(tenant_id, folder_id);
  }

  /** Return a single email and its comments */
  public async getEmail(tenant_id: string, id: string) {
    const email = await this.getById({ tenant_id, id });
    const comments = await this.commentsRepo.getForEmail(tenant_id, id);
    return { email, comments };
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
      },
    });
  }

  /** Assign an email to a user */
  public assignEmail(tenant_id: string, id: string, user_id: string) {
    return this.update({ tenant_id, id, row: { assigned_to: user_id } });
  }
}
