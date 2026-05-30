import { Component, effect, inject, output, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { Icon } from '@uxcommon/components/icons/icon';
import { TimeAgoPipe } from '@uxcommon/pipes/timeago.pipe';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

import { EmailsStore } from '../../services/store/emailstore';
import { ALL_FOLDERS } from 'common/src/lib/emails';
import type { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-list',
  imports: [Icon, TimeAgoPipe],
  templateUrl: 'email-list.html',
  host: {
    '(document:click)': 'closeContextMenu()',
    '(document:keydown.escape)': 'closeContextMenu()',
  },
})
export class EmailList {
  private readonly store = inject(EmailsStore);
  private readonly alertSvc = inject(AlertService);

  @ViewChild('scrollContainer') public scrollContainer?: ElementRef<HTMLUListElement>;

  /** Emit to parent so it can set selection in the store */
  public readonly emailSelected = output<EmailType>();

  /** Emit composition actions up to the email client */
  public readonly reply = output<EmailType>();
  public readonly replyAll = output<EmailType>();
  public readonly forward = output<EmailType>();

  /** Context menu state */
  public readonly showContextMenu = signal<boolean>(false);
  public readonly contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  public readonly contextMenuEmail = signal<EmailType | null>(null);

  /** Emails in the currently selected folder (reactive) */
  public readonly emails = this.store.emailsInSelectedFolder;

  /** Currently selected folder ID (reactive) */
  public readonly currentFolderId = computed(() => this.store.currentSelectedFolderId());

  protected readonly isLoadingMore = this.store.isLoadingMore;
  protected readonly ALL_FOLDERS = ALL_FOLDERS;

  protected onScroll(event: Event): void {
    this.closeContextMenu();
    const el = event.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      void this.store.loadNextPage();
    }
  }

  /** Sort order for the email list */
  public readonly sortOrder = signal<'newest' | 'oldest'>('newest');

  /** Chronologically sorted email list */
  public readonly sortedEmails = computed(() => {
    const list = [...this.emails()];
    const order = this.sortOrder();
    return list.sort((a, b) => {
      const timeA = new Date(a.date_sent || a.updated_at).getTime();
      const timeB = new Date(b.date_sent || b.updated_at).getTime();
      return order === 'newest' ? timeB - timeA : timeA - timeB;
    });
  });

  constructor() {
    let lastFolderId: string | null = null;

    // Auto-select the first email when the folder changes or the current selection is removed.
    effect(() => {
      const folderId = this.store.currentSelectedFolderId();
      const emails = this.sortedEmails();
      const selectedId = this.store.currentSelectedEmailId();

      const folderChanged = folderId !== lastFolderId;
      lastFolderId = folderId;

      if (folderChanged && this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = 0;
      }

      // If the list is empty, clear any existing selection and bail out.
      if (emails.length === 0) {
        if (selectedId) {
          // The selected email was removed; clear selection so parent can react.
          this.store.selectEmail(null);
        }
        return;
      }

      if (folderId) {
        // Auto-select the first email only if:
        // 1. The folder has changed, OR
        // 2. The previously selected email is no longer in the list (e.g., deleted or moved).
        const currentSelectionStillExists = selectedId ? emails.some((e) => e.id === selectedId) : false;

        if (folderChanged || (selectedId && !currentSelectionStillExists)) {
          this.selectEmail(emails[0]);
        }
      }
    });
  }

  /** Is a given email id selected? */
  public isSelected(id: string): boolean {
    return this.store.currentSelectedEmailId() === id;
  }

  /** Select an email and emit it to the parent component */
  public selectEmail(email: EmailType): void {
    this.emailSelected.emit(email);
  }

  /** Handle right click to open context menu */
  public onContextMenu(event: MouseEvent, email: EmailType): void {
    event.preventDefault();
    this.selectEmail(email);
    this.contextMenuEmail.set(email);

    // Dynamic viewport boundary collision checking
    const menuWidth = 192; // equivalent to w-48
    const menuHeight = 280; // approximate maximum height

    let x = event.clientX;
    let y = event.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8;
    }

    this.contextMenuPosition.set({ x, y });
    this.showContextMenu.set(true);
  }

  public closeContextMenu(): void {
    this.showContextMenu.set(false);
  }

  protected handleReply(): void {
    const email = this.contextMenuEmail();
    this.closeContextMenu();
    if (email) this.reply.emit(email);
  }

  protected handleReplyAll(): void {
    const email = this.contextMenuEmail();
    this.closeContextMenu();
    if (email) this.replyAll.emit(email);
  }

  protected handleForward(): void {
    const email = this.contextMenuEmail();
    this.closeContextMenu();
    if (email) this.forward.emit(email);
  }

  protected isFolderTrash(): boolean {
    return this.currentFolderId() === ALL_FOLDERS.TRASH;
  }

  protected isFolderSpam(): boolean {
    return this.currentFolderId() === ALL_FOLDERS.SPAM;
  }

  protected async toggleReadStatus() {
    const email = this.contextMenuEmail();
    if (!email) return;
    this.closeContextMenu();
    try {
      await this.store.toggleEmailReadStatus(email.id, !email.is_read);
    } catch (e) {
      this.alertSvc.showError('Failed to update read status');
    }
  }

  protected async toggleFavourite() {
    const email = this.contextMenuEmail();
    if (!email) return;
    this.closeContextMenu();
    try {
      await this.store.toggleEmailFavoriteStatus(email.id, !email.is_favourite);
    } catch (e) {
      this.alertSvc.showError('Failed to update favorite status');
    }
  }

  protected async toggleClosed() {
    const email = this.contextMenuEmail();
    if (!email) return;
    this.closeContextMenu();
    const currentStatus = email.status || 'open';
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';
    try {
      await this.store.updateEmailStatus(email.id, newStatus);
    } catch (e) {
      this.alertSvc.showError('Failed to update email status');
    }
  }

  protected async deleteEmail() {
    const email = this.contextMenuEmail();
    if (!email) return;
    this.closeContextMenu();
    try {
      await this.store.deleteEmail(email.id);
    } catch (e) {
      this.alertSvc.showError('Failed to delete email');
    }
  }

  protected restoreFromTrash() {
    const email = this.contextMenuEmail();
    if (!email) return;
    this.closeContextMenu();
    this.store.restoreFromTrash(email.id);
  }

  protected async moveToInbox() {
    const email = this.contextMenuEmail();
    if (!email) return;
    this.closeContextMenu();
    try {
      await this.store.moveToFolder(email.id, ALL_FOLDERS.INBOX);
      this.alertSvc.showSuccess('Email moved to Inbox');
    } catch (e) {
      this.alertSvc.showError('Failed to move email to Inbox');
    }
  }

  protected async markAsSpam() {
    const email = this.contextMenuEmail();
    if (!email) return;
    this.closeContextMenu();
    try {
      await this.store.moveToFolder(email.id, ALL_FOLDERS.SPAM);
      this.alertSvc.showSuccess('Email marked as spam');
    } catch (e) {
      this.alertSvc.showError('Failed to mark email as spam');
    }
  }
}
