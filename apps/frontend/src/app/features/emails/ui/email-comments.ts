/**
 * @file Component handling comments for an email.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, Signal, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EmailsStore } from '../services/email-store';
import { EmailCommentType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'email-comments.html',
})
export class EmailComments {
  private store = inject(EmailsStore);

  /** Comments for the selected email */
  public comments = signal<Partial<EmailCommentType>[]>([]);

  /** New comment text */
  public newComment = '';

  /** Email to comment on */
  @Input() public email!: Signal<EmailType | null>;

  constructor() {
    // Sync comments with the selected email and load if needed
    effect(() => {
      const selectedEmail = this.email?.();
      if (!selectedEmail) {
        this.comments.set([]);
        return;
      }

      const headerData = this.store.getEmailHeaderById(selectedEmail.id)();
      if (!headerData) {
        // Load header/comments when not cached (e.g., when body panel is hidden)
        untracked(() => {
          this.store.loadEmailWithHeaders(selectedEmail.id);
        });
        this.comments.set([]);
        return;
      }

      this.comments.set((headerData as any).comments ?? []);
    });
  }

  /**
   * Add a comment to the selected email.
   */
  public async addComment() {
    const email = this.email();
    if (!email || !this.newComment) return;
    const created = await this.store.addComment(email.id, '1', this.newComment);
    this.comments.update((c) => [...c, created ?? { comment: this.newComment }]);
    this.newComment = '';
  }
}
