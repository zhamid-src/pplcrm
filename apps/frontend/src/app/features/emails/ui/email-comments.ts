/**
 * @file Component handling comments for an email.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, Signal, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IAuthUser } from '@common';
import { TimeAgoPipe } from '@uxcommon/timeago.pipe';

import { AuthService } from '../../../auth/auth-service';
import { EmailsStore } from '../services/store/emailstore';
import { EmailCommentType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe],
  templateUrl: 'email-comments.html',
})
export class EmailComments {
  // private alertSvc = inject(AlertService);
  private auth = inject(AuthService);
  private store = inject(EmailsStore);

  /** Comments for the selected email */
  public comments = signal<Partial<EmailCommentType>[]>([]);

  /** Email to comment on */
  @Input() public email!: Signal<EmailType | null>;

  /** New comment text */
  public newComment = '';

  /** Available users in the tenant who might have commented */
  public users = signal<IAuthUser[]>([]);

  constructor() {
    this.auth.getUsers().then((u) => this.users.set(u));

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
    if (!email?.id || !this.newComment) return;

    //TODO: author_id shouldn't be hardcoded
    // Ideally, this should come from the current user context
    const created = await this.store.addComment(email.id, '1', this.newComment);
    this.comments.update((c) => [...c, created ?? { comment: this.newComment }]);
    this.newComment = '';
  }

  /**
   * Get the display name for an assigned user.
   */
  public getUserName(id: string | null = null) {
    if (!id) return 'Not Assigned';
    return this.users().find((u) => u.id === id)?.first_name || 'Not Assigned';
  }
}
