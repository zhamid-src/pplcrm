/**
 * @file Component displaying emails for a selected folder.
 */
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, output } from '@angular/core';
import { Icon } from '@uxcommon/components/icons/icon';
import { TimeAgoPipe } from '@uxcommon/pipes/timeago.pipe';

import { EmailsStore } from '../../services/store/emailstore';
import type { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-list',
  standalone: true,
  imports: [CommonModule, Icon, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'email-list.html',
})
export class EmailList {
  private readonly store = inject(EmailsStore);

  /** Emit to parent so it can set selection in the store */
  public readonly emailSelected = output<EmailType>();

  /** Emails in the currently selected folder (reactive) */
  public readonly emails = this.store.emailsInSelectedFolder;

  constructor() {
    // Auto-select the first email when the current selection is removed.
    effect(() => {
      const folderId = this.store.currentSelectedFolderId();
      const emails = this.emails();
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
