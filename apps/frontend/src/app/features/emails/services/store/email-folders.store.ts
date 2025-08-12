/**
 * @file Folder list + counts + selection, plus loading emails for a folder.
 * Injects EmailStateStore to write normalized emails when a folder is selected.
 */
import { Injectable, computed, inject, signal } from '@angular/core';

import { EmailsService } from '../emails-service';
import { EmailStateStore } from './email-state.store';
import type { EmailFolderType } from 'common/src/lib/models';

@Injectable({ providedIn: 'root' })
export class EmailFoldersStore {
  /** Available email folders */
  private readonly emailFolders = signal<EmailFolderType[]>([]);
  private readonly state = inject(EmailStateStore);
  private readonly svc = inject(EmailsService);

  /** Folders list for UI */
  public readonly allFolders = computed(() => this.emailFolders());

  /** Currently selected folder ID */
  public readonly currentSelectedFolderId = signal<string | null>(null);

  public async loadAllFolders(): Promise<EmailFolderType[]> {
    const folders = (await this.svc.getFolders()) as EmailFolderType[];
    this.emailFolders.set(folders);
    return folders;
  }

  public async loadAllFoldersWithCounts(): Promise<(EmailFolderType & { email_count: number })[]> {
    const folders = (await this.svc.getFoldersWithCounts()) as (EmailFolderType & { email_count: number })[];
    this.emailFolders.set(folders);

    // Auto-select default folder if none chosen yet
    if (!this.currentSelectedFolderId() && folders.length > 0) {
      const def = folders.find((f) => f.is_default);
      if (def) this.selectFolder(def);
    }
    return folders;
  }

  /** Load emails for a folder and normalize into EmailStateStore */
  public async loadEmailsForFolder(folderId: string): Promise<void> {
    const emailsFromServer = await this.svc.getEmails(folderId);
    this.state.setEmailsForFolder(folderId, emailsFromServer);
  }

  /** Refresh counts (after a mutation) */
  public async refreshFolderCounts(): Promise<void> {
    await this.loadAllFoldersWithCounts();
  }

  /**
   * Select a folder and load its emails into EmailStateStore.
   * Clears selected email to keep UI consistent.
   */
  public selectFolder(folder: EmailFolderType | null): void {
    const id = folder ? String(folder.id) : null;
    this.currentSelectedFolderId.set(id);
    if (id) void this.loadEmailsForFolder(id);
    this.state.selectEmail(null);
  }
}
