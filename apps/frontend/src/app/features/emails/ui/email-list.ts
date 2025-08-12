/**
 * @file Component displaying emails for a selected folder.
 */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, effect, inject } from '@angular/core';

import { EmailsStore } from '../services/store/emailstore';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'email-list.html',
})
export class EmailList {
  private store = inject(EmailsStore);

  /** Emits when an email is selected */
  @Output() public emailSelected = new EventEmitter<EmailType | null>();

  /** Emails in the selected folder from store */
  public emails = this.store.emailsInSelectedFolder;

  constructor() {
    effect(() => {
      // Only auto-select when folder changes, not when individual email properties change
      const folderId = this.store.currentSelectedFolderId();
      const emails = this.emails();

      if (folderId && emails.length > 0 && !this.store.currentSelectedEmailId()) {
        this.selectEmail(emails[0]);
      }
    });
  }

  /**
   * Determine if an email is currently selected.
   */
  public isSelected(id: string) {
    return this.store.currentSelectedEmailId() === id;
  }

  /**
   * Select an email and emit it to the parent component.
   */
  public selectEmail(email: EmailType) {
    this.emailSelected.emit(email);
  }
}
