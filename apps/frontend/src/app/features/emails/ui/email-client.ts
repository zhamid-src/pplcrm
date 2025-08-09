/**
 * @file Container component for the email client, orchestrating folder, list and details components.
 */
import { Component, signal } from '@angular/core';
import { EmailFolderList } from './email-folder-list';
import { EmailList } from './email-list';
import { EmailDetails } from './email-details';

@Component({
  selector: 'pc-email-client',
  standalone: true,
  imports: [EmailFolderList, EmailList, EmailDetails],
  templateUrl: 'email-client.html',
})
export class EmailClient {
  /** Selected folder */
  public selectedFolder = signal<any | null>(null);

  /** Selected email */
  public selectedEmail = signal<any | null>(null);

  /**
   * Handle folder selection from child component.
   */
  public onFolder(folder: any) {
    this.selectedFolder.set(folder);
    this.selectedEmail.set(null);
  }

  /**
   * Handle email selection from child component.
   */
  public onEmail(email: any) {
    this.selectedEmail.set(email);
  }
}
