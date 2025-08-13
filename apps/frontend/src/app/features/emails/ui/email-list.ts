/**
 * @file Component displaying emails for a selected folder.
 */
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, effect, inject } from '@angular/core';

import { EmailsStore } from '../services/store/emailstore';
import type { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'email-list.html',
})
export class EmailList {
  private readonly store = inject(EmailsStore);

  /** Emit to parent so it can set selection in the store */
  @Output() public readonly emailSelected = new EventEmitter<EmailType>();

  /** Emails in the currently selected folder (reactive) */
  public readonly emails = this.store.emailsInSelectedFolder;

  constructor() {
    // Auto-select the first email in the folder when nothing is selected.
    effect(() => {
      const folderId = this.store.currentSelectedFolderId();
      const emails = this.emails();

      if (folderId && emails.length > 0 && !this.store.currentSelectedEmailId()) {
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
