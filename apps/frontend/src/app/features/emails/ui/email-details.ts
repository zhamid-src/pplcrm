/**
 * @file Component displaying details for a selected email, including comments and assignment.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IAuthUser } from '@common';
import { Icon } from '@uxcommon/icons/icon';

import { AuthService } from '../../../auth/auth-service';
import { EmailsService } from '../services/emails-service';
import { EmailCommentType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-details',
  standalone: true,
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: 'email-details.html',
})
export class EmailDetails {
  private auth = inject(AuthService);
  private svc: EmailsService = inject(EmailsService);

  /** Comments for the selected email */
  public comments = signal<Partial<EmailCommentType>[]>([]);

  /** Email to display details for */
  @Input() public email = signal<EmailType | null>(null);

  /** New comment text */
  public newComment = '';

  /** Available users for assignment */
  public users = signal<IAuthUser[]>([]);

  constructor() {
    this.auth.getUsers().then((u) => this.users.set(u));
  }

  /**
   * Add a comment to the selected email.
   */
  public async addComment() {
    const email = this.email();
    if (!email || !this.newComment) return;
    await this.svc.addComment(email.id, '1', this.newComment);
    this.comments.update((c) => [...c, { comment: this.newComment }]);
    this.newComment = '';
  }

  /**
   * Assign the selected email to a user or unassign if `null`.
   */
  public async assign(userId: string | null) {
    const email = this.email();
    if (!email) return;
    await this.svc.assign(email.id, userId);
    this.email.set({ ...email, assigned_to: userId || undefined });
  }

  /**
   * Get the display name for an assigned user.
   */
  public getUserName(id?: string) {
    if (!id) return 'Not Assigned';
    return this.users().find((u) => u.id === id)?.first_name || 'Not Assigned';
  }
}
