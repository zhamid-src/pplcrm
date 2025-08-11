/**
 * @file Container component for the email client, orchestrating folder, list and details components.
 */
import { Component, inject } from '@angular/core';

import { EmailsStore } from '../services/email-store';
import { EmailDetails } from './email-details';
import { EmailFolderList } from './email-folder-list';
import { EmailList } from './email-list';
import { EmailFolderType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-client',
  standalone: true,
  imports: [EmailFolderList, EmailList, EmailDetails],
  templateUrl: 'email-client.html',
})
export class EmailClient {
  private store = inject(EmailsStore);

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
}
