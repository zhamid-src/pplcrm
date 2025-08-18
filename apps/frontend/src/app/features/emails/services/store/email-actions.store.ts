/**
 * @file Mutating actions (assign, favourite, status, comments) with optimistic flows.
 * Centralizes rollback + optional refresh (folder contents & counts).
 */
import { Injectable, inject } from '@angular/core';

import { ComposePayload, DraftPayload } from '../../ui/email-compose/email-compose';
import { EmailsService } from '../emails-service';
import { EmailCacheStore } from './email-cache.store';
import { EmailFoldersStore } from './email-folders.store';
import { type EmailId, EmailStateStore } from './email-state.store';
import type { EmailDraftType, EmailType } from 'common/src/lib/models';

@Injectable({ providedIn: 'root' })
export class EmailActionsStore {
  private readonly cache = inject(EmailCacheStore);
  private readonly folders = inject(EmailFoldersStore);
  private readonly state = inject(EmailStateStore);
  private readonly svc = inject(EmailsService);

  /** Add a comment and update header cache so future reads include it */
  public async addComment(emailId: EmailId, authorId: string, commentText: string): Promise<any> {
    const created = await this.svc.addComment(String(emailId), authorId, commentText);
    this.cache.appendCommentToHeader(emailId, created);
    return created;
  }

  /** Assign/unassign with optimistic update and refreshes */
  public async assignEmailToUser(emailId: EmailId, userId: string | null): Promise<void> {
    const key = String(emailId);
    await this.updateProperty(key, { assigned_to: userId ?? undefined }, () => this.svc.assign(key, userId), {
      refreshFolder: true,
      refreshCounts: true,
    });
  }

  /** Delete a comment (optimistic remove + rollback on failure) */
  public async deleteComment(emailId: EmailId, commentId: string | number): Promise<void> {
    const key = String(emailId);
    const prevHeader = this.cache.getEmailHeaderById(key)(); // snapshot before change

    // Optimistic: remove from cache now
    this.cache.removeCommentFromHeader(key, commentId);

    try {
      await this.svc.deleteComment(key, String(commentId));
      // success: nothing else to do, UI is already updated
    } catch (e) {
      console.error('deleteComment failed; rolling back', e);
      if (typeof prevHeader !== 'undefined') {
        this.cache.replaceHeader(key, prevHeader);
      } else {
        // If we somehow had no header snapshot, refetch to get back to server truth
        await this.svc
          .getEmailWithHeaders(key)
          .then((res: any) => {
            this.cache.replaceHeader(key, res?.header ?? null);
          })
          .catch(() => {
            /* ignore */
          });
      }
      throw e;
    }
  }

  public getDraft(id: string): Promise<EmailDraftType> {
    return this.svc.getDraft(id);
  }

  public async saveDraft(input: DraftPayload): Promise<{ id: string }> {
    console.log(input);
    const saved = await this.svc.saveDraft(input);
    const currentFolderId = this.folders.currentSelectedFolderId();
    if (currentFolderId === '7') {
      await this.folders.loadEmailsForFolder('7');
    } else {
      await this.folders.refreshFolderCounts();
    }
    return saved as { id: string };
  }

  public async deleteDraft(id: string): Promise<void> {
    await this.svc.deleteDraft(id);
    await this.folders.refreshFolderCounts();
    if (this.folders.currentSelectedFolderId() === '7') {
      await this.folders.loadEmailsForFolder('7');
    }
  }

  /** Send a brand new email (with optional attachments). Refresh counts/folder after. */
  public async sendEmail(input: ComposePayload): Promise<EmailType> {
    const created = await this.svc.sendEmail(input); // implement in EmailsService (below)

    // If you're currently in "Sent", reload to show the new item; otherwise just refresh counts.
    const currentFolderId = this.folders.currentSelectedFolderId();
    if (currentFolderId) {
      await this.folders.loadEmailsForFolder(currentFolderId);
    }
    await this.folders.refreshFolderCounts();

    // Optional: warm header cache (if your API returns header)
    // this.cache.replaceHeader(String(created.id), created.header ?? null);

    return created;
  }

  /** Toggle favourite with optimistic update */
  public async toggleEmailFavoriteStatus(emailId: EmailId, isFavorite: boolean): Promise<void> {
    const key = String(emailId);
    const currentFolderId = this.folders.currentSelectedFolderId();
    await this.updateProperty(
      key,
      { is_favourite: isFavorite },
      () => this.svc.setFavourite(key, isFavorite),
      {
        refreshFolder: currentFolderId === '9',
        refreshCounts: true,
      },
    );
  }

  /** Update status and refresh counts (affects virtual folders) */
  public async updateEmailStatus(emailId: EmailId, status: EmailStatus): Promise<void> {
    const key = String(emailId);
    await this.updateProperty(key, { status }, () => this.svc.setStatus(key, status), {
      refreshFolder: true,
      refreshCounts: true,
    });
  }

  /**
   * Shared optimistic update with rollback and optional refresh of
   * current folder contents and counts.
   */
  private async updateProperty(
    emailKey: string,
    patch: Partial<EmailType>,
    serverCall: () => Promise<unknown>,
    opts?: { refreshFolder?: boolean; refreshCounts?: boolean },
  ): Promise<void> {
    const prev = this.state.patchEmail(emailKey, patch);
    if (!prev) {
      console.warn(`Email ${emailKey} not found in store`);
      return;
    }

    try {
      await serverCall();

      const currentFolderId = this.folders.currentSelectedFolderId();
      if (opts?.refreshFolder && currentFolderId) {
        await this.folders.loadEmailsForFolder(currentFolderId);
      }
      if (opts?.refreshCounts) {
        await this.folders.refreshFolderCounts();
      }
    } catch (e) {
      this.state.replaceEmail(emailKey, prev);
      throw e;
    }
  }
}

type EmailStatus = 'open' | 'closed' | 'resolved';
