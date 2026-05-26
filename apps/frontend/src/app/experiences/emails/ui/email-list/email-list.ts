import { Component, effect, inject, output, signal, computed } from '@angular/core';
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

  /** Emit to parent so it can set selection in the store */
  public readonly emailSelected = output<EmailType>();

  /** Emails in the currently selected folder (reactive) */
  public readonly emails = this.store.emailsInSelectedFolder;

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
    // Auto-select the first email when the current selection is removed.
    effect(() => {
      const folderId = this.store.currentSelectedFolderId();
      const emails = this.sortedEmails();
      const selectedId = this.store.currentSelectedEmailId();

      // If the list is empty, clear any existing selection and bail out.
      if (emails.length === 0) {
        if (selectedId) {
          // The selected email was removed; clear selection so parent can react.
          this.store.selectEmail(null);
        }
        return;
      }

      if (folderId) {
        // If nothing is selected or the current selection no longer exists in the list,
        // automatically select the first email.
        if (!selectedId || !emails.some((e) => e.id === selectedId)) {
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
