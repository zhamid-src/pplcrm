// emails.store.ts
import { Injectable, computed, inject } from '@angular/core';
import { EmailStatus } from '@common';

import { EmailsService } from '../emails-service';
import { EmailActionsStore } from './email-actions.store';
import { EmailCacheStore } from './email-cache.store';
import { EmailFoldersStore } from './email-folders.store';
import { type EmailId, EmailStateStore } from './email-state.store';
import type { EmailFolderType, EmailType } from 'common/src/lib/models';

@Injectable({ providedIn: 'root' })
export class EmailsStore {
  // ----------------- Lazy per-email fallback -----------------
  //  private readonly _checked = new Set<string>();
  private readonly actions = inject(EmailActionsStore);
  private readonly cache = inject(EmailCacheStore);
  private readonly emailSvc = inject(EmailsService);

  /*
  private readonly ensureHasAttachmentOnOpen = effect(() => {
    const id = this.currentSelectedEmailId();
    if (!id) return;

    // Skip if already known or in-flight
    if (this.state.hasAttachment(id)() !== undefined) return;
    if (this._checked.has(id)) return;
    this._checked.add(id);

    // Ask backend for this one email
    this.emailSvc
      .hasAttachment(id)
      .then((has) => {
        this.state.setHasAttachment(id, !!has);
      })
      .catch(() => {
        // leave as undefined on error; next open can retry
        this._checked.delete(id);
      });
  });
  */
  private readonly folders = inject(EmailFoldersStore);
  private readonly state = inject(EmailStateStore);

  /** All folders */
  public readonly allFolders = this.folders.allFolders;

  /** Selected email */
  public readonly currentSelectedEmail = this.state.currentSelectedEmail;

  /** Selected email id */
  public readonly currentSelectedEmailId = this.state.currentSelectedEmailId;

  /** Selected folder id */
  public readonly currentSelectedFolderId = this.folders.currentSelectedFolderId;

  /** Emails in currently selected folder */
  public readonly emailsInSelectedFolder = computed(() => {
    const fid = this.folders.currentSelectedFolderId();
    if (!fid) return [] as EmailType[];
    return this.state.emailsInFolderWithFlags(fid)();
  });

  // ----------------- Cache computed factories -----------------
  public readonly getEmailBodyById = this.cache.getEmailBodyById;
  public readonly getEmailHeaderById = this.cache.getEmailHeaderById;

  /** Whether the email body is expanded to fill the window */
  public readonly isBodyExpanded = this.state.isBodyExpanded;

  // ----------------- Mutations (actions) -----------------
  public addComment(emailId: EmailId, authorId: string, commentText: string) {
    return this.actions.addComment(emailId, authorId, commentText);
  }

  public assignEmailToUser(emailId: EmailId, userId: string | null) {
    return this.actions.assignEmailToUser(emailId, userId);
  }

  public deleteComment(emailId: EmailId, commentId: string | number) {
    return this.actions.deleteComment(emailId, commentId);
  }

  // ----------------- Loads -----------------
  public loadAllFolders() {
    return this.folders.loadAllFolders();
  }

  public loadAllFoldersWithCounts() {
    return this.folders.loadAllFoldersWithCounts();
  }

  public loadEmailBody(emailId: EmailId) {
    return this.cache.loadEmailBody(emailId);
  }

  public loadEmailWithHeaders(emailId: EmailId) {
    return this.cache.loadEmailWithHeaders(emailId);
  }

  /** Load emails for a folder, then set hasAttachment flags (bulk). */
  public async loadEmailsForFolder(folderId: EmailId) {
    const rows = await this.folders.loadEmailsForFolder(String(folderId));

    // Prefer IDs from the response; fallback to state if needed
    const ids =
      (Array.isArray(rows) ? rows.map((e: any) => String(e.id)) : []) ||
      this.state.emailIdsByFolderId()[String(folderId)] ||
      [];

    if (!ids.length) return rows;

    try {
      // If your endpoint accepts ids:
      // const counts: Record<string, number> = await this.emailSvc.getAttachmentCountByEmails(ids);

      // If your current endpoint returns all counts (no args), filter locally:
      const counts: Record<string, number> = await this.emailSvc.getAttachmentCountByEmails();
      this.state.setManyHasAttachment(ids.map((id) => ({ id, has: (counts[id] ?? 0) > 0 })));
    } catch {
      // ignore count failures; UI can lazily resolve per-email below
    }

    return rows;
  }

  public refreshFolderCounts() {
    return this.folders.refreshFolderCounts();
  }

  // ----------------- Read/selection helpers -----------------
  public selectEmail(email: EmailType | { id: EmailId } | null): void {
    this.state.selectEmail(email);
  }

  public selectFolder(folder: EmailFolderType | null): void {
    this.folders.selectFolder(folder);
  }

  public toggleBodyExpanded(): void {
    this.state.toggleBodyExpanded();
  }

  public toggleEmailFavoriteStatus(emailId: EmailId, isFavorite: boolean) {
    return this.actions.toggleEmailFavoriteStatus(emailId, isFavorite);
  }

  public updateEmailStatus(emailId: EmailId, status: EmailStatus) {
    return this.actions.updateEmailStatus(emailId, status);
  }
}
