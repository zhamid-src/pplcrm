/**
 * @file Simple email client demonstrating folder and message retrieval.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailsService } from '../services/emails-service';

@Component({
  selector: 'pc-email-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex gap-4">
      <div class="w-1/5">
        <ul>
          <li *ngFor="let f of folders" (click)="selectFolder(f)">{{ f.name }}</li>
        </ul>
      </div>
      <div class="w-1/5">
        <ul>
          <li *ngFor="let e of emails" (click)="selectEmail(e)">{{ e.subject }}</li>
        </ul>
      </div>
      <div class="flex-1" *ngIf="selectedEmail">
        <h3>{{ selectedEmail.subject }}</h3>
        <p>{{ selectedEmail.body }}</p>
        <div>
          <div *ngFor="let c of comments">{{ c.comment }}</div>
          <textarea [(ngModel)]="newComment"></textarea>
          <button (click)="addComment()">Add Comment</button>
        </div>
        <div class="mt-2">
          <input [(ngModel)]="assignTo" placeholder="Assign to user id" />
          <button (click)="assign()">Assign</button>
        </div>
      </div>
    </div>
  `,
})
export class EmailClient implements OnInit {
  /** List of folders retrieved from the backend */
  folders: any[] = [];
  /** Emails in the selected folder */
  emails: any[] = [];
  /** Comments for the selected email */
  comments: any[] = [];
  /** Currently selected email */
  selectedEmail: any | null = null;
  /** New comment text */
  newComment = '';
  /** User ID to assign selected email to */
  assignTo = '';

  /** Injects the EmailsService */
  constructor(private svc: EmailsService) {}

  /**
   * Lifecycle hook to load folders on initialization.
   */
  async ngOnInit() {
    this.folders = await this.svc.getFolders();
  }

  /**
   * Select a folder and load its emails.
   * @param folder Folder object from the list
   */
  async selectFolder(folder: any) {
    const e = await this.svc.getEmails(folder.id);
    this.emails = e;
    this.selectedEmail = null;
    this.comments = [];
  }

  /**
   * Select an email and retrieve its details and comments.
   * @param email Email object to load
   */
  async selectEmail(email: any) {
    const res = await this.svc.getEmail(email.id);
    this.selectedEmail = res.email;
    this.comments = res.comments;
  }

  /**
   * Add a comment to the selected email.
   */
  async addComment() {
    if (!this.selectedEmail || !this.newComment) return;
    await this.svc.addComment(this.selectedEmail.id, '1', this.newComment);
    this.comments.push({ comment: this.newComment });
    this.newComment = '';
  }

  /**
   * Assign the selected email to a user.
   */
  async assign() {
    if (!this.selectedEmail || !this.assignTo) return;
    await this.svc.assign(this.selectedEmail.id, this.assignTo);
    this.selectedEmail.assigned_to = this.assignTo;
    this.assignTo = '';
  }
}
