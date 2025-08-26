import { getAllEmailFolders } from '../../config/email-folders.config';
import { AppError, BadRequestError, InternalError, NotFoundError } from '../../errors/app-errors';
import { EmailAttachmentsRepo } from './repositories/email-attachments.repo';
import { EmailBodiesRepo } from './repositories/email-body.repo';
import { EmailCommentsRepo } from './repositories/email-comments.repo';
import { EmailDraftsRepo } from './repositories/email-drafts.repo';
import { EmailRepo } from './repositories/email.repo';
import { BaseController } from '../../lib/base.controller';
import { ALL_FOLDERS, EmailStatus } from 'common/src/lib/emails';
import { OperationDataType, TypeTenantId } from 'common/src/lib/kysely.models';
import { EmailDraftType } from 'common/src/lib/models';

/** Controller handling email operations */
export class EmailsController extends BaseController<'emails', EmailRepo> {
  private attachmentsRepo = new EmailAttachmentsRepo();
  private bodiesRepo = new EmailBodiesRepo();
  private commentsRepo = new EmailCommentsRepo();
  private draftsRepo = new EmailDraftsRepo();

  constructor() {
    super(new EmailRepo());
  }

  /** Generic error handler to reduce repetition */
  private handle<T>(fn: () => Promise<T>, message: string) {
    return fn().catch((err) => {
      if (err instanceof AppError) throw err;
      throw new InternalError(message, undefined, { cause: err });
    });
  }

  /** Add a comment to an email */
  public async addComment(tenant_id: string, email_id: string, author_id: string, comment: string) {
    if (!comment?.trim()) {
      throw new BadRequestError('Comment cannot be empty');
    }
    return this.handle(async () => {
      const row = await this.commentsRepo.add({
        row: {
          tenant_id,
          email_id,
          author_id,
          comment,
          createdby_id: author_id,
          updatedby_id: author_id,
        } as OperationDataType<'emails', 'insert'>,
      });
      if (!row) throw new InternalError('Failed to add comment');
      return row;
    }, 'Failed to add comment');
  }

  /** Assign an email to a user */
  public async assignEmail(tenant_id: string, id: string, user_id: string | null) {
    return this.handle(async () => {
      const updated = await this.update({
        tenant_id,
        id,
        row: { assigned_to: user_id } as OperationDataType<'emails', 'insert'>,
      });
      if (!updated) throw new NotFoundError('Email not found');
      return updated;
    }, 'Failed to assign email');
  }

  /**
   * Deletes a single row by ID for a given tenant.
   *
   * @param tenant_id - The tenant's ID
   * @param idToDelete - The row's ID
   * @returns A Promise resolving to the deleted row (if any)
   */
  public override async delete(tenant_id: TypeTenantId<'emails'>, idToDelete: string) {
    return this.deleteMany(tenant_id, [idToDelete]);
  }

  /** Delete a comment from an email */
  public async deleteComment(tenant_id: string, _email_id: string, comment_id: string) {
    return this.handle(async () => {
      const deleted = await this.commentsRepo.delete({ tenant_id, id: comment_id /*, email_id */ });
      if (!deleted) throw new NotFoundError('Comment not found');
      return deleted;
    }, 'Failed to delete comment');
  }

  /** Delete a draft by ID for a given tenant and user */
  public async deleteDraft(tenant_id: string, _user_id: string, id: string) {
    return this.handle(async () => {
      const deleted = await this.draftsRepo.delete({ tenant_id, id });
      if (!deleted) throw new NotFoundError('Draft not found');
      return deleted;
    }, 'Failed to delete draft');
  }

  /**
   * Deletes multiple rows by ID for a given tenant.
   *
   * @param tenant_id - The tenant's ID
   * @param idsToDelete - Array of row IDs to delete
   * @returns A Promise resolving to the deleted rows (if any)
   */
  public override async deleteMany(tenant_id: TypeTenantId<'emails'>, idsToDelete: string[]) {
    // Go through idsToDelete and check which ones are in the trash folder (hard delete)
    // and which ones are not (soft delete - move to trash)
    const emailsInTrash = await this.getRepo().getByIdsInFolder(tenant_id as string, idsToDelete, ALL_FOLDERS.TRASH);
    const idsInTrash = emailsInTrash.map((e) => String(e.id));
    const idsNotInTrash = idsToDelete.filter((id) => !idsInTrash.includes(id));

    const numTrashed =
      idsNotInTrash.length > 0 ? await this.getRepo().moveToTrash(tenant_id as string, idsNotInTrash) : 0;
    const numDeleted = idsInTrash.length > 0 && (await super.deleteMany(tenant_id, idsInTrash));
    return numTrashed !== 0 || numDeleted;
  }

  /** Get all attachments for a given email */
  public async getAllAttachments(tenant_id: string, email_id: string, options?: { includeInline: boolean }) {
    return this.handle(
      () => this.attachmentsRepo.getAllAttachments(tenant_id, email_id, options),
      'Failed to fetch attachments',
    );
  }

  /** Get attachments by email ID */
  public async getAttachmentsByEmailId(tenant_id: string, email_id: string) {
    return this.handle(
      () => this.attachmentsRepo.getByEmailId(tenant_id, email_id),
      'Failed to fetch attachments for email',
    );
  }

  /** Get a draft by ID for a given tenant and user */
  public async getDraft(tenant_id: string, _user_id: string, value: string) {
    return this.handle(async () => {
      const draft = await this.draftsRepo.getOneBy('id', { tenant_id, value });
      if (!draft) throw new NotFoundError('Draft not found');
      return draft;
    }, 'Failed to fetch draft');
  }

  /** Return a single email and its comments */
  public async getEmailBody(tenant_id: string, value: string) {
    return this.handle(async () => {
      const email = await this.bodiesRepo.getOneBy('email_id', { tenant_id, value });
      if (email) return email;

      const draft = (await this.draftsRepo.getOneBy('id', { tenant_id, value })) as EmailDraftType | undefined;
      if (draft)
        return {
          email_id: value,
          body_html: draft.body_html ?? '',
          body_delta: (draft as any).body_delta ?? null,
        } as any;

      throw new NotFoundError('Failed to fetch email body');
    }, 'Failed to fetch email body');
  }

  /** Return a single email with headers, recipients, and comments */
  public async getEmailHeader(tenant_id: string, id: string) {
    return this.handle(async () => {
      const [emailWithHeaders, comments, attachments] = await Promise.all([
        this.getRepo().getEmailWithHeadersAndRecipients(tenant_id, id),
        this.commentsRepo.getForEmail(tenant_id, id),
        this.attachmentsRepo.getByEmailId(tenant_id, id),
      ]);
      if (emailWithHeaders) return { email: emailWithHeaders, comments, attachments };

      const draft = (await this.draftsRepo.getOneBy('id', { tenant_id, value: id })) as EmailDraftType | undefined;
      if (draft)
        return {
          email: {
            id: draft.id,
            to_list: (draft.to_list || []).map((e: string) => ({ email: e })),
            cc_list: (draft.cc_list || []).map((e: string) => ({ email: e })),
            bcc_list: (draft.bcc_list || []).map((e: string) => ({ email: e })),
            from_email: null,
            subject: draft.subject,
          },
          comments: [],
          attachments: [],
        } as any;

      throw new NotFoundError('Email not found');
    }, 'Failed to fetch email header');
  }

  /** Return all emails for the given folder */
  public async getEmails(user_id: string, tenant_id: string, folder_id: string) {
    return this.handle(async () => {
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
          attachment_count: 0,
          has_attachment: false,
          status: 'open',
        }));
      }
      return await this.getRepo().getByFolderWithAttachmentFlag(user_id, tenant_id, folder_id);
    }, 'Failed to fetch emails');
  }

  /** Return all folders, sorted by sort_order */
  public getFolders(_tenant_id: string) {
    // Return hardcoded folders configuration (same for all tenants)
    return Promise.resolve(getAllEmailFolders());
  }

  /** Return all folders for a tenant with email counts */
  public async getFoldersWithCounts(user_id: string, tenant_id: string) {
    return this.handle(async () => {
      const [folders, emailCounts, draftCount] = await Promise.all([
        this.getFolders(tenant_id),
        this.getRepo().getEmailCountsByFolder(user_id, tenant_id),
        this.draftsRepo.countByUser(tenant_id, user_id),
      ]);

      return folders.map((folder: any) => ({
        ...folder,
        email_count: folder.id === ALL_FOLDERS.DRAFTS ? draftCount : emailCounts[folder.id] || 0,
      }));
    }, 'Failed to fetch folder counts');
  }

  /** Check if a given email has attachments */
  public async hasAttachment(tenant_id: string, email_id: string) {
    return this.handle(
      () => this.attachmentsRepo.hasAttachment(tenant_id, email_id),
      'Failed to check attachment flag',
    );
  }

  /** Check which emails (by IDs) have attachments */
  public async hasAttachmentByEmailIds(tenant_id: string, email_ids: string[]) {
    if (!email_ids?.length) return Promise.resolve([]);
    return this.handle(
      () => this.attachmentsRepo.hasAttachmentByEmailIds(tenant_id, email_ids),
      'Failed to check attachment flags',
    );
  }

  public restoreFromTrash(tenant_id: string, idsToRestore: string[]) {
    return this.getRepo().restoreFromTrash(tenant_id, idsToRestore);
  }

  public async saveDraft(
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
    return this.handle(async () => {
      const saved = await this.draftsRepo.saveDraft(tenant_id, user_id, draft);
      if (!saved) throw new InternalError('Failed to save draft');
      return saved;
    }, 'Failed to save draft');
  }

  public async setFavourite(tenant_id: string, id: string, favourite: boolean) {
    return this.handle(
      () => this.getRepo().setFavourite(tenant_id, id, favourite),
      'Failed to set favourite',
    );
  }

  /** Update email status (open/closed/resolved) */
  public async setStatus(tenant_id: string, id: string, status: EmailStatus) {
    return this.handle(async () => {
      const updated = await this.getRepo().setStatus(tenant_id, id, status);
      if (!updated) throw new NotFoundError('Email not found');
      return updated;
    }, 'Failed to set status');
  }
}
