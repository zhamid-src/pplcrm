/**
 * @file Container component for the email client, orchestrating folder, list and details components.
 */
import { Component, signal } from '@angular/core';

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
  /** Selected email */
  public selectedEmail = signal<EmailType | null>(null);

  /** Selected folder */
  public selectedFolder = signal<EmailFolderType | null>(null);

  /**
   * Handle email selection from child component.
   */
  public onEmail(email: EmailType) {
    this.selectedEmail.set(email);
  }

  /**
   * Handle folder selection from child component.
   */
  public onFolder(folder: EmailFolderType) {
    this.selectedFolder.set(folder);
    this.selectedEmail.set(null);
  }
}
