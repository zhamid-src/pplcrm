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
    <div class="flex h-[80vh] text-sm bg-white">
      <!-- Folder list -->
      <aside class="w-64 bg-gray-50 border-r border-gray-200">
        <h2 class="px-4 py-2 text-xs font-semibold text-gray-600">Folders</h2>
        <ul>
          <li
            *ngFor="let f of folders"
            (click)="selectFolder(f)"
            [ngClass]="{ 'bg-blue-100 text-blue-600': selectedFolder?.id === f.id }"
            class="cursor-pointer px-4 py-2 hover:bg-blue-50"
          >
            {{ f.name }}
          </li>
        </ul>
      </aside>

      <!-- Email list -->
      <section class="w-80 border-r border-gray-200">
        <h2 class="px-4 py-2 text-xs font-semibold text-gray-600">Emails</h2>
        <ul>
          <li
            *ngFor="let e of emails"
            (click)="selectEmail(e)"
            [ngClass]="{ 'bg-blue-50': selectedEmail?.id === e.id }"
            class="border-b border-gray-100 cursor-pointer px-4 py-2 hover:bg-blue-50"
          >
            <div class="truncate font-medium">{{ e.subject }}</div>
            <div class="truncate text-xs text-gray-500">{{ e.body }}</div>
          </li>
        </ul>
      </section>

      <!-- Email details -->
      <section class="flex-1 flex flex-col">
        <ng-container *ngIf="selectedEmail; else empty">
          <header class="border-b border-gray-200 p-4">
            <h3 class="text-lg font-semibold">{{ selectedEmail.subject }}</h3>
            <p class="text-xs text-gray-500" *ngIf="selectedEmail.assigned_to">
              Assigned to {{ selectedEmail.assigned_to }}
            </p>
          </header>
          <main class="flex-1 overflow-auto p-4 space-y-4">
            <p>{{ selectedEmail.body }}</p>

            <div>
              <h4 class="mb-2 font-semibold">Comments</h4>
              <div *ngFor="let c of comments" class="mb-2 rounded bg-gray-100 p-2">
                {{ c.comment }}
              </div>
              <textarea
                [(ngModel)]="newComment"
                placeholder="Add a comment"
                class="w-full rounded border p-2"
              ></textarea>
              <button (click)="addComment()" class="mt-2 rounded bg-blue-600 px-3 py-1 text-white">Add Comment</button>
            </div>

            <div class="mt-4">
              <h4 class="mb-2 font-semibold">Assign</h4>
              <div class="flex items-center gap-2">
                <input [(ngModel)]="assignTo" placeholder="Assign to user id" class="flex-1 rounded border p-2" />
                <button (click)="assign()" class="rounded bg-green-600 px-3 py-1 text-white">Assign</button>
              </div>
            </div>
          </main>
        </ng-container>
        <ng-template #empty>
          <div class="flex flex-1 items-center justify-center text-gray-400">Select an email to view its content</div>
        </ng-template>
      </section>
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
  /** Selected folder */
  selectedFolder: any | null = null;
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
    this.selectedFolder = folder;
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
