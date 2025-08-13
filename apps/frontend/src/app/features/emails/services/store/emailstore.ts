/**
 * @file Orchestrator that composes the smaller stores into a single public API.
 * Keep your components injecting this class to minimize churn.
 */
import { Injectable, computed, inject } from '@angular/core';

import { EmailActionsStore } from './email-actions.store';
import { EmailCacheStore } from './email-cache.store';
import { EmailFoldersStore } from './email-folders.store';
import { type EmailId, EmailStateStore } from './email-state.store';
import type { EmailFolderType, EmailType } from 'common/src/lib/models';

@Injectable({ providedIn: 'root' })
export class EmailsStore {
  private readonly actions = inject(EmailActionsStore);
  private readonly cache = inject(EmailCacheStore);
  private readonly folders = inject(EmailFoldersStore);
  private readonly state = inject(EmailStateStore);

  // ----------------- Public computed signals (compat with your original API) -----------------

  /** All folders */
  public readonly allFolders = this.folders.allFolders;

  /** Selected email */
  public readonly currentSelectedEmail = this.state.currentSelectedEmail;

  /** Selected email id */
  public readonly currentSelectedEmailId = this.state.currentSelectedEmailId;

  /** Selected folder id */
  public readonly currentSelectedFolderId = this.folders.currentSelectedFolderId;

  /** Whether the email body is expanded to fill the window */
  public readonly isBodyExpanded = this.state.isBodyExpanded;

  /** Emails in currently selected folder */
  public readonly emailsInSelectedFolder = computed(() => {
    const fid = this.folders.currentSelectedFolderId();
    if (!fid) return [] as EmailType[];
    return this.state.emailsInFolder(fid)();
  });

  // ----------------- Cache computed factories -----------------
  public readonly getEmailBodyById = this.cache.getEmailBodyById;
  public readonly getEmailHeaderById = this.cache.getEmailHeaderById;

  // ----------------- Mutations (actions) -----------------
  public addComment(emailId: EmailId, authorId: string, commentText: string) {
    return this.actions.addComment(emailId, authorId, commentText);
  }

  public assignEmailToUser(emailId: EmailId, userId: string | null) {
    return this.actions.assignEmailToUser(emailId, userId);
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

  public loadEmailsForFolder(folderId: EmailId) {
    return this.folders.loadEmailsForFolder(String(folderId));
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

  public toggleEmailFavoriteStatus(emailId: EmailId, isFavorite: boolean) {
    return this.actions.toggleEmailFavoriteStatus(emailId, isFavorite);
  }

  public updateEmailStatus(emailId: EmailId, status: 'open' | 'closed' | 'resolved') {
    return this.actions.updateEmailStatus(emailId, status);
  }

  /** Set the expanded state for the email body view */
  public setBodyExpanded(expanded: boolean): void {
    this.state.setBodyExpanded(expanded);
  }

  /** Toggle the email body expanded UI state */
  public toggleBodyExpanded(): void {
    this.state.toggleBodyExpanded();
  }
}
