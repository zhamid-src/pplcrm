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
  folders: any[] = [];
  emails: any[] = [];
  comments: any[] = [];
  selectedEmail: any | null = null;
  newComment = '';
  assignTo = '';

  constructor(private svc: EmailsService) {}

  ngOnInit() {
    this.svc.getFolders().subscribe((f) => (this.folders = f));
  }

  selectFolder(folder: any) {
    this.svc.getEmails(folder.id).subscribe((e) => {
      this.emails = e;
      this.selectedEmail = null;
      this.comments = [];
    });
  }

  selectEmail(email: any) {
    this.svc.getEmail(email.id).subscribe((res) => {
      this.selectedEmail = res.email;
      this.comments = res.comments;
    });
  }

  addComment() {
    if (!this.selectedEmail || !this.newComment) return;
    this.svc.addComment(this.selectedEmail.id, '1', this.newComment).subscribe(() => {
      this.comments.push({ comment: this.newComment });
      this.newComment = '';
    });
  }

  assign() {
    if (!this.selectedEmail || !this.assignTo) return;
    this.svc.assign(this.selectedEmail.id, this.assignTo).subscribe(() => {
      this.selectedEmail.assigned_to = this.assignTo;
      this.assignTo = '';
    });
  }
}
