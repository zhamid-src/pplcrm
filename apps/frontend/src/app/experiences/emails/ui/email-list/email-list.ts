import { Component, effect, inject, output, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { Icon } from '@uxcommon/components/icons/icon';
import { TimeAgoPipe } from '@uxcommon/pipes/timeago.pipe';

import { EmailsStore } from '../../services/store/emailstore';
import type { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-list',
  imports: [Icon, TimeAgoPipe],
  templateUrl: 'email-list.html',
})
export class EmailList {
  private readonly store = inject(EmailsStore);

  @ViewChild('scrollContainer') public scrollContainer?: ElementRef<HTMLUListElement>;

  /** Emit to parent so it can set selection in the store */
  public readonly emailSelected = output<EmailType>();

  /** Emails in the currently selected folder (reactive) */
  public readonly emails = this.store.emailsInSelectedFolder;

  protected readonly isLoadingMore = this.store.isLoadingMore;

  protected onScroll(event: Event): void {
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
}
