/**
 * @file Simple email client demonstrating folder and message retrieval.
 */
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Swap } from '../../../uxcommon/swap';
import { EmailsService } from '../services/emails-service';

@Component({
  selector: 'pc-email-client',
  standalone: true,
  imports: [CommonModule, FormsModule, Swap],
  templateUrl: 'email-client.html',
})
export class EmailClient implements OnInit {
  private readonly svc = inject(EmailsService);

  /** User ID to assign selected email to */
  public assignTo = '';

  /** Comments for the selected email */
  public comments = signal<any[]>([]);

  /** Emails in the selected folder */
  public emails = signal<any[]>([]);

  /** List of folders retrieved from the backend */
  public folders = signal<any[]>([]);

  /** Indicates whether the folder sidebar is collapsed */
  public foldersCollapsed = signal(false);

  /** New comment text */
  public newComment = '';

  /** Currently selected email */
  public selectedEmail = signal<any | null>(null);

  /** Selected folder */
  public selectedFolder = signal<any | null>(null);

  /**
   * Add a comment to the selected email.
   */
  public async addComment() {
    if (!this.selectedEmail() || !this.newComment) return;

    await this.svc.addComment(this.selectedEmail().id, '1', this.newComment);

    this.comments.update((current) => [...current, { comment: this.newComment }]);
    this.newComment = '';
  }

  /**
   * Assign the selected email to a user.
   */
  public async assign() {
    if (!this.selectedEmail() || !this.assignTo) return;

    await this.svc.assign(this.selectedEmail().id, this.assignTo);
    this.selectedEmail().assigned_to = this.assignTo;
    this.assignTo = '';
  }

  /**
   * Lifecycle hook to load folders on initialization.
   */
  public async ngOnInit() {
    const folders = await this.svc.getFolders();
    this.folders.set(folders);
  }

  /**
   * Select an email and retrieve its details and comments.
   * @param email Email object to load
   */
  public async selectEmail(email: any) {
    const res = await this.svc.getEmail(email.id);

    this.selectedEmail.set(res.email);
    this.comments.set(res.comments);
  }

  /**
   * Select a folder and load its emails.
   * @param folder Folder object from the list
   */
  public async selectFolder(folder: any) {
    this.selectedFolder.set(folder);

    const emails = await this.svc.getEmails(folder.id);
    this.emails.set(emails);
    this.selectedEmail.set(null);
    this.comments.set([]);
  }

  /**
   * Toggle the collapse state of the folder sidebar.
   */
  public toggleFolders() {
    this.foldersCollapsed.set(!this.foldersCollapsed());
  }
}
