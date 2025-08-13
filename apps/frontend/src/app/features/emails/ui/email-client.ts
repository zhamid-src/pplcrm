/**
 * @file Container component for the email client, orchestrating folder, list and details components.
 */
import { Component, HostListener, inject } from '@angular/core';
import { Swap } from '@uxcommon/swap';

import { EmailsStore } from '../services/store/emailstore';
import { EmailBody } from './email-body';
import { EmailDetails } from './email-details';
import { EmailFolderList } from './email-folder-list';
import { EmailList } from './email-list';
import { EmailFolderType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-client',
  standalone: true,
  imports: [EmailFolderList, EmailList, EmailDetails, Swap, EmailBody],
  templateUrl: 'email-client.html',
})
export class EmailClient {
  private store = inject(EmailsStore);

  /** Whether the email body is expanded to fill the window (except sidebar). */
  public isBodyExpanded = this.store.isBodyExpanded;

  // Use store's computed properties
  public selectedEmail = this.store.currentSelectedEmail;
  public selectedFolder = this.store.currentSelectedFolderId;

  /**
   * Handle email selection from child component.
   */
  public onEmail(email: EmailType) {
    this.store.selectEmail(email);
  }

  /**
   * Handle folder selection from child component.
   */
  public onFolder(folder: EmailFolderType) {
    this.store.selectFolder(folder);
  }

  /**
   * Toggle the full-screen overlay for email body.
   */
  public toggleExpanded(): void {
    this.store.toggleBodyExpanded();
  }

  /**
   * Collapse the full-screen overlay when Escape is pressed.
   */
  @HostListener('document:keydown', ['$event'])
  protected handleDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.isBodyExpanded()) {
      this.store.toggleBodyExpanded();
      ev.stopPropagation();
      ev.preventDefault();
    }
  }
}
