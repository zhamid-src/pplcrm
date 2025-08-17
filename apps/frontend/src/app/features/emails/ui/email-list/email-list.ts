/**
 * @file Component displaying emails for a selected folder.
 */
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, output } from '@angular/core';
import { Icon } from '@uxcommon/icons/icon';
import { TimeAgoPipe } from '@uxcommon/timeago.pipe';

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
    // Auto-select the first email in the folder when nothing is selected.
    effect(() => {
      const folderId = this.store.currentSelectedFolderId();
      const emails = this.emails();

      // Do not auto-select for drafts (id '7') to avoid auto-opening compose
      if (
        folderId &&
        folderId !== '7' &&
        emails.length > 0 &&
        !this.store.currentSelectedEmailId()
      ) {
        this.selectEmail(emails[0]);
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
